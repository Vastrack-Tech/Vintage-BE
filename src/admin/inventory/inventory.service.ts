import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { Parser } from 'json2csv';
import { Readable } from 'stream';
import { generateId } from '../../database/schema/utils';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { CreateColorDto } from './dto/create-color.dto';
import { eq, desc, and, ilike, sql, SQL, gt, lte, notInArray, count, sum } from 'drizzle-orm';

@Injectable()
export class InventoryService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    private readonly EXCHANGE_RATE = 1500;


    async exportProducts() {
        // 1. Fetch ALL products (No limit/offset)
        const products = await this.db.query.products.findMany({
            orderBy: (products, { desc }) => [desc(products.createdAt)],
            with: {
                category: true,
                variants: true,
            },
        });

        // 2. Flatten the data for CSV
        // (Excel handles simple objects better than nested JSON)
        const flatData = products.map((p) => {
            // Calculate total stock from variants if they exist
            const totalStock = p.variants.length > 0
                ? p.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)
                : p.stockQuantity;

            return {
                "Product ID": p.id,
                "Name": p.title,
                "Category": p.category?.name || "Uncategorized",
                "Price (NGN)": p.priceNgn,
                "Price (USD)": p.priceUsd,
                "Stock Quantity": totalStock,
                "Status": (p.stockQuantity || 0) > 0 ? "In Stock" : "Out of Stock",
                "Date Created": p.createdAt?.toISOString().split('T')[0],
            };
        });

        // 3. Convert to CSV
        const parser = new Parser();
        const csv = parser.parse(flatData);

        return csv;
    }

    async getStats() {
        // 1. Total Products (Assuming you want to count Parent Products)
        const totalProductsQuery = await this.db
            .select({ count: count(schema.products.id) })
            .from(schema.products);
        const totalProducts = Number(totalProductsQuery[0]?.count || 0);

        // 2. New Products (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newProductsQuery = await this.db
            .select({ count: count(schema.products.id) })
            .from(schema.products)
            .where(gt(schema.products.createdAt, sevenDaysAgo));
        const newProducts = Number(newProductsQuery[0]?.count || 0);

        // 3. Empty Products (Out of Stock)
        // Checking both Product and Variant levels just in case
        const emptyProductsQuery = await this.db
            .select({ count: count(schema.products.id) })
            .from(schema.products)
            .where(lte(schema.products.stockQuantity, 0));
        const emptyProducts = Number(emptyProductsQuery[0]?.count || 0);

        // 👇 4. Products Sold (Sum of Quantities from Order Items)
        // We join with 'orders' to exclude cancelled/pending orders
        const productsSoldQuery = await this.db
            .select({
                totalQty: sum(schema.orderItems.quantity)
            })
            .from(schema.orderItems)
            .leftJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .where(notInArray(schema.orders.status, ['cancelled', 'pending']));

        const productsSold = Number(productsSoldQuery[0]?.totalQty || 0);

        return {
            totalProducts: { value: totalProducts, trend: 12, trendDirection: 'up' },
            newProducts: { value: newProducts, trend: 5, trendDirection: 'up' },
            productsSold: { value: productsSold, trend: 10, trendDirection: 'up' },
            emptyProducts: { value: emptyProducts, trend: 2, trendDirection: 'down' },
        };
    }

    async getCategories() {
        return await this.db.query.categories.findMany({
            orderBy: (categories, { asc }) => [asc(categories.name)],
        });
    }

    async create(dto: CreateProductDto) {
        return await this.db.transaction(async (tx) => {
            const category = await tx.query.categories.findFirst({
                where: eq(schema.categories.id, dto.categoryId)
            });
            if (!category) throw new BadRequestException("Invalid Category ID");

            const [newProduct] = await tx
                .insert(schema.products)
                .values({
                    id: generateId('VINPROD'),
                    categoryId: dto.categoryId,
                    title: dto.title,
                    description: dto.description,
                    stockQuantity: dto.stockQuantity ?? null,
                    priceNgn: dto.priceNgn.toString(),
                    priceUsd: dto.priceUsd.toString(),
                    compareAtPriceNgn: dto.compareAtPriceNgn?.toString(),
                    compareAtPriceUsd: dto.compareAtPriceUsd?.toString(),
                    gallery: dto.gallery || [],
                    tags: dto.tags || [],
                    options: dto.options || [],
                    isHot: dto.isHot || false,
                    isActive: dto.isActive ?? true,
                    features: dto.features,
                    shippingPolicy: dto.shippingPolicy,
                })
                .returning();

            if (dto.variants && dto.variants.length > 0) {
                await tx.insert(schema.variants).values(
                    dto.variants.map((v) => ({
                        id: generateId('VINVAR'),
                        productId: newProduct.id,
                        name: v.name,
                        stockQuantity: v.stockQuantity ?? null, // 👈 Pass variant nulls straight through too
                        attributes: v.attributes || {},
                        priceOverrideNgn: v.priceOverrideNgn?.toString() ?? null,
                        priceOverrideUsd: v.priceOverrideUsd?.toString() ?? null,
                        image: v.image || null,
                        sku: `SKU-${generateId('VAR').split('-')[1]}`,
                    }))
                );
            }

            return newProduct;
        });
    }

    async update(id: string, dto: UpdateProductDto) {
        return await this.db.transaction(async (tx) => {
            const product = await tx.query.products.findFirst({
                where: eq(schema.products.id, id),
            });

            if (!product) throw new NotFoundException('Product not found');

            const {
                // @ts-ignore
                createdAt, updatedAt, id: _, variants, category, reviews,
                ...cleanDto
            } = dto as any;


            const [updatedProduct] = await tx
                .update(schema.products)
                .set({
                    ...cleanDto,
                    stockQuantity: dto.stockQuantity ?? null,
                    priceNgn: dto.priceNgn?.toString(),
                    priceUsd: dto.priceUsd?.toString(),
                    compareAtPriceNgn: dto.compareAtPriceNgn?.toString(),
                    compareAtPriceUsd: dto.compareAtPriceUsd?.toString(),
                    options: dto.options,
                    updatedAt: new Date(),
                })
                .where(eq(schema.products.id, id))
                .returning();

            // 2. SMART VARIANTS UPDATE
            if (variants && variants.length > 0) {
                // Get all currently existing variants for this product
                const existingVariants = await tx.query.variants.findMany({
                    where: eq(schema.variants.productId, id)
                });

                // Track IDs coming from the frontend
                const incomingIds = variants.map(v => v.id).filter(Boolean);

                // A. Delete variants that are no longer in the payload
                const variantsToDelete = existingVariants.filter(ev => !incomingIds.includes(ev.id));
                for (const vDel of variantsToDelete) {
                    await tx.delete(schema.variants).where(eq(schema.variants.id, vDel.id));
                }

                // B. Upsert (Update or Insert) Variants
                for (const v of variants) {
                    if (v.id) {
                        // UPDATE existing variant by exact ID
                        await tx.update(schema.variants)
                            .set({
                                name: v.name,
                                stockQuantity: v.stockQuantity ?? null,
                                priceOverrideNgn: v.priceOverrideNgn !== null && v.priceOverrideNgn !== undefined ? v.priceOverrideNgn.toString() : null,
                                priceOverrideUsd: v.priceOverrideUsd !== null && v.priceOverrideUsd !== undefined ? v.priceOverrideUsd.toString() : null,
                                image: v.image || null,
                                attributes: v.attributes,
                            })
                            .where(eq(schema.variants.id, v.id));
                    } else {
                        // INSERT brand new variant
                        await tx.insert(schema.variants).values({
                            id: generateId('VINVAR'),
                            productId: id,
                            name: v.name,
                            stockQuantity: v.stockQuantity ?? null,
                            attributes: v.attributes || {},
                            priceOverrideNgn: v.priceOverrideNgn !== null && v.priceOverrideNgn !== undefined ? v.priceOverrideNgn.toString() : null,
                            priceOverrideUsd: v.priceOverrideUsd !== null && v.priceOverrideUsd !== undefined ? v.priceOverrideUsd.toString() : null,
                            image: v.image || null,
                            sku: `SKU-${generateId('VAR').split('-')[1]}`,
                        });
                    }
                }
            } else {
                await tx.delete(schema.variants).where(eq(schema.variants.productId, id));
            }

            return updatedProduct;
        });
    }

    // ... (findAll, findOne, delete remain unchanged) ...
    async findAll(query: GetInventoryDto) {
        const { page = 1, limit = 10, search, categoryId, minPrice, maxPrice, view } = query;
        const offset = (page - 1) * limit;

        // ----------------------------
        // CASE A: "SOLD" VIEW (Optimized with JOIN)
        // ----------------------------
        if (view === 'sold') {
            const whereConditions: SQL[] = [
                notInArray(schema.orders.status, ['cancelled', 'pending'])
            ];

            if (search) whereConditions.push(ilike(schema.products.title, `%${search}%`));
            if (categoryId) whereConditions.push(eq(schema.products.categoryId, categoryId));

            // Query: Join Products -> OrderItems -> Orders -> Categories
            const data = await this.db
                .select({
                    id: schema.products.id,
                    title: schema.products.title,
                    priceNgn: schema.products.priceNgn,
                    stockQuantity: schema.products.stockQuantity,
                    gallery: schema.products.gallery,
                    categoryId: schema.products.categoryId,
                    // The alias definition (keep this)
                    totalSold: sql<number>`CAST(SUM(${schema.orderItems.quantity}) AS INTEGER)`,
                    categoryName: schema.categories.name,
                })
                .from(schema.products)
                .innerJoin(schema.orderItems, eq(schema.products.id, schema.orderItems.productId))
                .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
                .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
                .where(and(...whereConditions))
                .groupBy(schema.products.id, schema.categories.name)

                // 👇 FIX IS HERE: Sort by the SUM calculation, not the alias name
                .orderBy(desc(sql`CAST(SUM(${schema.orderItems.quantity}) AS INTEGER)`))

                .limit(limit)
                .offset(offset);

            // Transform data to match the expected shape of your frontend
            const formattedData = data.map(item => ({
                ...item,
                category: { name: item.categoryName }, // Mock the relation shape
                variants: [] // Variants not needed for this specific view
            }));

            // Get Total Count (Distinct products sold)
            const countRes = await this.db
                .select({ count: sql<number>`count(distinct ${schema.products.id})` })
                .from(schema.products)
                .innerJoin(schema.orderItems, eq(schema.products.id, schema.orderItems.productId))
                .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
                .where(and(...whereConditions));

            return {
                data: formattedData,
                meta: {
                    total: Number(countRes[0]?.count || 0),
                    page,
                    limit,
                    totalPages: Math.ceil(Number(countRes[0]?.count || 0) / limit),
                },
            };
        }

        // ... (CASE B: STANDARD VIEW - Remains unchanged) ...
        const filters: SQL[] = [];

        if (search) filters.push(ilike(schema.products.title, `%${search}%`));
        if (categoryId) filters.push(eq(schema.products.categoryId, categoryId));
        if (minPrice) filters.push(sql`cast(${schema.products.priceNgn} as numeric) >= ${minPrice}`);
        if (maxPrice) filters.push(sql`cast(${schema.products.priceNgn} as numeric) <= ${maxPrice}`);

        // Handle Empty Filter
        if (view === 'empty') {
            filters.push(lte(schema.products.stockQuantity, 0));
        }

        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        const [data, totalCount] = await Promise.all([
            this.db.query.products.findMany({
                where: whereClause,
                limit: limit,
                offset: offset,
                orderBy: (products, { desc }) => [desc(products.createdAt)],
                with: {
                    category: true,
                    variants: true,
                },
            }),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.products)
                .where(whereClause)
                .then((res) => Number(res[0]?.count || 0)),
        ]);

        return {
            data,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    async findOne(id: string) {
        const product = await this.db.query.products.findFirst({
            where: eq(schema.products.id, id),
            with: {
                category: true,
                variants: true,
            },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    async delete(id: string) {
        return await this.db.transaction(async (tx) => {
            const product = await tx.query.products.findFirst({
                where: eq(schema.products.id, id),
            });

            if (!product) {
                throw new NotFoundException('Product not found');
            }

            await tx.delete(schema.variants).where(eq(schema.variants.productId, id));
            await tx.delete(schema.products).where(eq(schema.products.id, id));

            return { success: true, message: `Product ${id} and its variants deleted successfully` };
        });
    }

    async getColors() {
        // Return all colors alphabetically
        return await this.db.query.productColors.findMany({
            orderBy: (colors, { asc }) => [asc(colors.name)],
        });
    }

    async addColor(dto: CreateColorDto) {
        // Check for duplicates
        const existing = await this.db.query.productColors.findFirst({
            where: eq(schema.productColors.name, dto.name)
        });

        if (existing) {
            throw new BadRequestException(`Color '${dto.name}' already exists.`);
        }

        const [newColor] = await this.db.insert(schema.productColors).values({
            id: generateId('VINCOL'),
            name: dto.name,
            hexCode: dto.hexCode || '#000000',
            imageUrl: dto.imageUrl || null,
        }).returning();

        return newColor;
    }

    async deleteColor(id: string) {
        const [deleted] = await this.db.delete(schema.productColors)
            .where(eq(schema.productColors.id, id))
            .returning();

        if (!deleted) throw new NotFoundException('Color not found');
        return { message: 'Color deleted successfully' };
    }
}