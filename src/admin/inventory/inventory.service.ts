import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { generateId } from '../../database/schema/utils';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { eq, desc, and, ilike, sql, SQL, gt, lte } from 'drizzle-orm'; // Added SQL type import

@Injectable()
export class InventoryService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    // Mock Rate for auto-conversion if USD is missing
    private readonly EXCHANGE_RATE = 1500;

    async getStats() {
        // 1. Total Products
        const totalProductsQuery = await this.db.select({ count: sql<number>`count(*)` }).from(schema.products);
        const totalProducts = Number(totalProductsQuery[0]?.count || 0);

        // 2. New Products (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newProductsQuery = await this.db.select({ count: sql<number>`count(*)` })
            .from(schema.products)
            .where(gt(schema.products.createdAt, sevenDaysAgo));
        const newProducts = Number(newProductsQuery[0]?.count || 0);

        // 3. Empty Products (Out of Stock)
        const emptyProductsQuery = await this.db.select({ count: sql<number>`count(*)` })
            .from(schema.products)
            .where(lte(schema.products.stockQuantity, 0));
        const emptyProducts = Number(emptyProductsQuery[0]?.count || 0);

        // 4. Products Sold (Requires Orders Module - Mock for now)
        // TODO: Join with 'order_items' table when Orders module is ready
        const productsSold = 0;

        return {
            totalProducts: { value: totalProducts, trend: 12, trendDirection: 'up' }, // Trends can be calculated by comparing vs previous week
            newProducts: { value: newProducts, trend: 5, trendDirection: 'up' },
            productsSold: { value: productsSold, trend: 0, trendDirection: 'down' },
            emptyProducts: { value: emptyProducts, trend: 2, trendDirection: 'down' },
        };
    }

    // --- CATEGORIES ---
    async getCategories() {
        return await this.db.query.categories.findMany({
            orderBy: (categories, { asc }) => [asc(categories.name)],
        });
    }

    // --- PRODUCTS ---
    async create(dto: CreateProductDto) {
        return await this.db.transaction(async (tx) => {
            // 0. Verify Category Exists
            const category = await tx.query.categories.findFirst({
                where: eq(schema.categories.id, dto.categoryId)
            });
            if (!category) throw new BadRequestException("Invalid Category ID");

            // 1. Calculate USD if not provided
            const priceUsd = dto.priceUsd ?? Number((dto.priceNgn / this.EXCHANGE_RATE).toFixed(2));
            const compareUsd = dto.compareAtPriceUsd
                ?? (dto.compareAtPriceNgn ? Number((dto.compareAtPriceNgn / this.EXCHANGE_RATE).toFixed(2)) : null);

            // 2. Insert Product
            const [newProduct] = await tx
                .insert(schema.products)
                .values({
                    id: generateId('VINPROD'),
                    categoryId: dto.categoryId,
                    title: dto.title,
                    description: dto.description,
                    stockQuantity: dto.stockQuantity || 0,
                    priceNgn: dto.priceNgn.toString(),
                    priceUsd: priceUsd.toString(),
                    compareAtPriceNgn: dto.compareAtPriceNgn?.toString(),
                    compareAtPriceUsd: compareUsd?.toString(),
                    gallery: dto.gallery || [],
                    tags: dto.tags || [],
                    isHot: dto.isHot || false,
                    isActive: dto.isActive ?? true,
                    features: dto.features,
                    shippingPolicy: dto.shippingPolicy,
                })
                .returning();

            // 3. Insert Variants
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
                        sku: `SKU-${generateId('VAR').split('-')[1]}`,
                    }))
                );
            }

            return newProduct;
        });
    }

    async update(id: string, dto: UpdateProductDto) {
        const product = await this.db.query.products.findFirst({
            where: eq(schema.products.id, id),
        });

        if (!product) throw new NotFoundException('Product not found');

        // 1. Sanitize: Remove system fields that shouldn't be updated manually
        // We explicitly extract them to prevent Drizzle from crashing on string timestamps
        const {
            // @ts-ignore - these might not exist on the type but might exist in the runtime object
            createdAt,
            // @ts-ignore
            updatedAt,
            // @ts-ignore
            id: _, // exclude ID
            ...cleanDto
        } = dto as any;

        const [updatedProduct] = await this.db
            .update(schema.products)
            .set({
                ...cleanDto,
                // Ensure decimal fields are strings
                priceNgn: dto.priceNgn?.toString(),
                priceUsd: dto.priceUsd?.toString(),
                stockQuantity: dto.stockQuantity,
                compareAtPriceNgn: dto.compareAtPriceNgn?.toString(),
                compareAtPriceUsd: dto.compareAtPriceUsd?.toString(),

                // Manually set updatedAt to a valid Date object
                updatedAt: new Date(),
            })
            .where(eq(schema.products.id, id))
            .returning();

        return updatedProduct;
    }

    async findAll(query: GetInventoryDto) {
        const { page = 1, limit = 10, search, categoryId, minPrice, maxPrice } = query;
        const offset = (page - 1) * limit;

        // 1. Build Dynamic Filters (Explicitly Typed)
        const filters: SQL[] = [];

        if (search) {
            // Case-insensitive search on title
            filters.push(ilike(schema.products.title, `%${search}%`));
        }

        if (categoryId) {
            filters.push(eq(schema.products.categoryId, categoryId));
        }

        if (minPrice) {
            // Cast decimal column to numeric for comparison
            filters.push(sql`cast(${schema.products.priceNgn} as numeric) >= ${minPrice}`);
        }

        if (maxPrice) {
            filters.push(sql`cast(${schema.products.priceNgn} as numeric) <= ${maxPrice}`);
        }

        // 2. Execute Query
        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        const [data, totalCount] = await Promise.all([
            // A. Get Data
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

            // B. Get Total Count (optimized)
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(schema.products)
                .where(whereClause)
                .then((res) => Number(res[0]?.count || 0)),
        ]);

        // 3. Return Pagination Metadata
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
}