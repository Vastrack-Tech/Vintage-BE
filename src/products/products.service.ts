import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import {
  and,
  desc,
  asc,
  eq,
  ilike,
  or,
  gte,
  lte,
  sql,
  arrayContains,
} from 'drizzle-orm';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // --- 1. GET LIST (Filters, Search, Pagination) ---
  async findAll(dto: GetProductsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sort,
      tags,
    } = dto;
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(schema.products.isActive, true)];

    if (search) {
      const searchLower = `%${search}%`;
      filters.push(
        or(
          ilike(schema.products.title, searchLower),
          ilike(schema.products.description, searchLower),
        ),
      );
    }

    if (categoryId) {
      filters.push(eq(schema.products.categoryId, categoryId));
    }

    if (minPrice) {
      filters.push(gte(schema.products.basePrice, minPrice.toString()));
    }

    if (maxPrice) {
      filters.push(lte(schema.products.basePrice, maxPrice.toString()));
    }

    if (tags && tags.length > 0) {
      filters.push(
        sql`${schema.products.tags} ?| array[${sql.join(tags, sql`, `)}]`,
      );
    }

    let orderBy;
    switch (sort) {
      case 'price_asc':
        orderBy = asc(schema.products.basePrice);
        break;
      case 'price_desc':
        orderBy = desc(schema.products.basePrice);
        break;
      case 'rating_desc':
        orderBy = desc(schema.products.averageRating);
        break;
      case 'new_arrival':
      default:
        orderBy = desc(schema.products.createdAt);
    }

    const data = await this.db.query.products.findMany({
      where: and(...filters),
      limit: limit,
      offset: offset,
      orderBy: orderBy,
      with: {
        category: true,
        // variants: true, // Optional: Include variants in list view? usually heavy.
      },
    });

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(and(...filters));

    const total = Number(countResult[0].count);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --- 2. GET DETAILS (Single Product) ---
  async findOne(id: string) {
    const product = await this.db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        category: true,
        variants: true,
        reviews: {
          limit: 5,
          orderBy: desc(schema.reviews.createdAt),
          with: { user: true },
        },
      },
    });

    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);

    return product;
  }
}