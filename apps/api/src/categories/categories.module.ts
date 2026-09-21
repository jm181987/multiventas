import { Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UserRole } from '@multiventas/db';

class CategoryDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsInt() sortOrder = 0;
  @IsOptional() @IsBoolean() isActive = true;
}

class CategoryUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
class CategoriesService {
  constructor(private readonly db: DbService) {}
  tree() {
    return this.db.client.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }
  create(dto: CategoryDto) { return this.db.client.category.create({ data: dto }); }
  update(id: string, dto: CategoryUpdateDto) { return this.db.client.category.update({ where: { id }, data: dto }); }
}

@Controller('categories')
class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}
  @Get() tree() { return this.categories.tree(); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/categories')
class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}
  @Post() create(@Body() dto: CategoryDto) { return this.categories.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CategoryUpdateDto) { return this.categories.update(id, dto); }
}

@Module({
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
