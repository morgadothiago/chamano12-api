import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginResponseDto, AuthUserResponseDto } from './dto/auth-user-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (email + senha) — emite JWT' })
  @ApiResponse({ status: 200, description: 'Login efetuado', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de novo usuário (role driver) — emite JWT' })
  @ApiResponse({ status: 201, description: 'Conta criada', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async register(@Body() dto: RegisterDriverDto) {
    return this.authService.register({
      name: dto.nome,
      email: dto.email,
      password: dto.password,
      role: 'driver',
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Logout — no-op no servidor (JWT é stateless); client descarta o token',
  })
  @ApiResponse({ status: 200, description: 'Logout efetuado' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  logout(): { loggedOut: true } {
    return { loggedOut: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retorna o usuário autenticado atual' })
  @ApiResponse({ status: 200, description: 'Usuário atual', type: AuthUserResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }
}
