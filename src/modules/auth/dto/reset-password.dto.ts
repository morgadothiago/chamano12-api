import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'motorista@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '482913', description: 'Código de 6 dígitos enviado por email' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'novaSenha123' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
