import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { RegisterPassengerDto } from './dto/register-passenger.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
  @ApiResponse({ status: 403, description: 'Conta não é de motorista (deviceType=motorista)' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.deviceType);
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

  @Post('register-passenger')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de novo usuário (role passenger) — emite JWT' })
  @ApiResponse({ status: 201, description: 'Conta criada', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async registerPassenger(@Body() dto: RegisterPassengerDto) {
    return this.authService.register({
      name: dto.nome,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      role: 'passenger',
    });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Envia código de 6 dígitos por email pra redefinir senha' })
  @ApiResponse({ status: 200, description: 'Se o email existir, um código foi enviado' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Se o e-mail existir, enviaremos um código de recuperação.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Redefine a senha usando o código enviado por email' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
    return { message: 'Senha redefinida com sucesso.' };
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
