import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { generateId } from '../../database/schema/utils';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { eq, desc, and, ilike, sql, SQL, gt, lte } from 'drizzle-orm';

@Injectable()
export class InventoryService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    private readonly EXCHANGE_RATE = 1500;

    // ... (getStats and getCategories remain unchanged) ...
    async getStats() {
        const totalProductsQuery = await this.db.select({ count: sql<number>`count(*)` }).from(schema.products);
        const totalProducts = Number(totalProductsQuery[0]?.count || 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newProductsQuery = await this.db.select({ count: sql<number>`count(*)` })
            .from(schema.products)
            .where(gt(schema.products.createdAt, sevenDaysAgo));
        const newProducts = Number(newProductsQuery[0]?.count || 0);

        const emptyProductsQuery = await this.db.select({ count: sql<number>`count(*)` })
            .from(schema.products)
            .where(lte(schema.products.stockQuantity, 0));
        const emptyProducts = Number(emptyProductsQuery[0]?.count || 0);

        const productsSold = 0;

        return {
            totalProducts: { value: totalProducts, trend: 12, trendDirection: 'up' },
            newProducts: { value: newProducts, trend: 5, trendDirection: 'up' },
            productsSold: { value: productsSold, trend: 0, trendDirection: 'down' },
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

            // 👇 FIX: Calculate Total Stock from Variants
            let totalStock = dto.stockQuantity || 0;
            if (dto.variants && dto.variants.length > 0) {
                totalStock = dto.variants.reduce((sum, v) => sum + Number(v.stockQuantity || 0), 0);
            }

            const [newProduct] = await tx
                .insert(schema.products)
                .values({
                    id: generateId('VINPROD'),
                    categoryId: dto.categoryId,
                    title: dto.title,
                    description: dto.description,
                    stockQuantity: totalStock, // 👈 Use calculated sum
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
                        stockQuantity: v.stockQuantity,
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

            // Calculate Total Stock
            let totalStock = dto.stockQuantity || product.stockQuantity;
            if (variants && variants.length > 0) {
                totalStock = variants.reduce((sum: number, v: any) => sum + Number(v.stockQuantity || 0), 0);
            }

            // 1. Update Product Details
            const [updatedProduct] = await tx
                .update(schema.products)
                .set({
                    ...cleanDto,
                    stockQuantity: totalStock,
                    priceNgn: dto.priceNgn?.toString(),
                    priceUsd: dto.priceUsd?.toString(),
                    compareAtPriceNgn: dto.compareAtPriceNgn?.toString(),
                    compareAtPriceUsd: dto.compareAtPriceUsd?.toString(),
                    options: dto.options,
                    updatedAt: new Date(),
                })
                .where(eq(schema.products.id, id))
                .returning();

            // 2. SMART VARIANTS UPDATE (Fixes the crash)
            if (variants && variants.length > 0) {
                // Get all currently existing variants for this product
                const existingVariants = await tx.query.variants.findMany({
                    where: eq(schema.variants.productId, id)
                });

                for (const v of variants) {
                    // Match by Name (e.g., "Red / 18 inch")
                    const existing = existingVariants.find(ev => ev.name === v.name);

                    if (existing) {
                        // UPDATE existing variant
                        await tx.update(schema.variants)
                            .set({
                                stockQuantity: Number(v.stockQuantity),
                                priceOverrideNgn: v.priceOverrideNgn?.toString() ?? null,
                                priceOverrideUsd: v.priceOverrideUsd?.toString() ?? null,
                                image: v.image || null,
                                attributes: v.attributes || existing.attributes,
                            })
                            .where(eq(schema.variants.id, existing.id));
                    } else {
                        // INSERT new variant
                        await tx.insert(schema.variants).values({
                            id: generateId('VINVAR'),
                            productId: id,
                            name: v.name,
                            stockQuantity: Number(v.stockQuantity),
                            attributes: v.attributes || {},
                            priceOverrideNgn: v.priceOverrideNgn?.toString() ?? null,
                            priceOverrideUsd: v.priceOverrideUsd?.toString() ?? null,
                            image: v.image || null,
                            sku: `SKU-${generateId('VAR').split('-')[1]}`,
                        });
                    }
                }
            }

            return updatedProduct;
        });
    }

    // ... (findAll, findOne, delete remain unchanged) ...
    async findAll(query: GetInventoryDto) {
        const { page = 1, limit = 10, search, categoryId, minPrice, maxPrice } = query;
        const offset = (page - 1) * limit;

        const filters: SQL[] = [];

        if (search) {
            filters.push(ilike(schema.products.title, `%${search}%`));
        }

        if (categoryId) {
            filters.push(eq(schema.products.categoryId, categoryId));
        }

        if (minPrice) {
            filters.push(sql`cast(${schema.products.priceNgn} as numeric) >= ${minPrice}`);
        }

        if (maxPrice) {
            filters.push(sql`cast(${schema.products.priceNgn} as numeric) <= ${maxPrice}`);
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
}