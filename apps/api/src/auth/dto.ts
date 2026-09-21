import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

export class RegisterBuyerDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() phone?: string;
}

export class RegisterVendorDto extends RegisterBuyerDto {
  @IsString() @IsNotEmpty() businessName!: string;
  @IsString() @IsNotEmpty() storeName!: string;
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) storeSlug!: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken!: string;
}
