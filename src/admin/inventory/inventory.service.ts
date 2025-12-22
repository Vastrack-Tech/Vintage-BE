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

            const priceUsd = dto.priceUsd ?? Number((dto.priceNgn / this.EXCHANGE_RATE).toFixed(2));
            const compareUsd = dto.compareAtPriceUsd
                ?? (dto.compareAtPriceNgn ? Number((dto.compareAtPriceNgn / this.EXCHANGE_RATE).toFixed(2)) : null);

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
        return await this.db.transaction(async (tx) => {
            const product = await tx.query.products.findFirst({
                where: eq(schema.products.id, id),
            });

            if (!product) throw new NotFoundException('Product not found');

            // 1. Sanitize & Update Product
            // 🛑 FIX: We must remove 'category', 'reviews', 'variants' from the DTO
            // because they are relations, not columns. Drizzle will crash if we try to set them.
            const {
                // @ts-ignore
                createdAt,
                // @ts-ignore
                updatedAt,
                // @ts-ignore
                id: _,
                variants,
                // @ts-ignore
                category, // 👈 REMOVE THIS
                // @ts-ignore
                reviews,  // 👈 REMOVE THIS
                ...cleanDto
            } = dto as any;

            const [updatedProduct] = await tx
                .update(schema.products)
                .set({
                    ...cleanDto,
                    priceNgn: dto.priceNgn?.toString(),
                    priceUsd: dto.priceUsd?.toString(),
                    stockQuantity: dto.stockQuantity,
                    compareAtPriceNgn: dto.compareAtPriceNgn?.toString(),
                    compareAtPriceUsd: dto.compareAtPriceUsd?.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(schema.products.id, id))
                .returning();

            // 2. Handle Variants Update (Delete All -> Re-insert)
            if (variants) {
                // A. Delete existing variants
                await tx.delete(schema.variants).where(eq(schema.variants.productId, id));

                // B. Insert new variants
                if (variants.length > 0) {
                    await tx.insert(schema.variants).values(
                        variants.map((v: any) => ({
                            id: generateId('VINVAR'),
                            productId: id,
                            name: v.name,
                            stockQuantity: v.stockQuantity,
                            attributes: v.attributes || {},
                            priceOverrideNgn: v.priceOverrideNgn?.toString() ?? null,
                            priceOverrideUsd: v.priceOverrideUsd?.toString() ?? null,
                            sku: `SKU-${generateId('VAR').split('-')[1]}`,
                        }))
                    );
                }
            }

            return updatedProduct;
        });
    }

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