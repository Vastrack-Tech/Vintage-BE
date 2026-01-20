import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { SupabaseAuthGuard } from '../auth/guard/auth.guard';
import { CurrentUser } from '../auth/decorator/user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post()
    @UseGuards(SupabaseAuthGuard)
    @ApiBearerAuth()
    async create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
        return this.reviewsService.create(user.userId, dto);
    }

    @Get(':productId')
    async getReviews(@Param('productId') productId: string) {
        return this.reviewsService.getProductReviews(productId);
    }

    @Get('eligibility/:productId')
    @UseGuards(SupabaseAuthGuard)
    @ApiBearerAuth()
    async checkEligibility(
        @CurrentUser() user: any,
        @Param('productId') productId: string,
    ) {
        return this.reviewsService.checkEligibility(user.userId, productId);
    }
}