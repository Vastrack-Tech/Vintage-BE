import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';

@ApiTags('Contact Requests')
@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) { }

    @Post()
    @ApiOperation({ summary: 'Submit a new contact request form' })
    @ApiResponse({ status: 201, description: 'Request submitted successfully' })
    async create(@Body() dto: CreateRequestDto) {
        return this.requestsService.create(dto);
    }
}