import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.from = this.config.get<string>('MAIL_FROM') ?? 'CHAMA Nº 12 <onboarding@resend.dev>';
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY não configurada — emails serão apenas logados, não enviados.');
    }
  }

  async sendPasswordResetCode(to: string, name: string, code: string): Promise<void> {
    const subject = 'Seu código para redefinir a senha — CHAMA Nº 12';
    const html = this.buildPasswordResetTemplate(name, code);

    if (!this.resend) {
      this.logger.log(`[DEV] Código de reset para ${to}: ${code}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Falha ao enviar email de reset para ${to}: ${error.message}`);
      throw new Error('Não foi possível enviar o email de recuperação.');
    }
  }

  private buildPasswordResetTemplate(name: string, code: string): string {
    return `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#0B0C0E; padding:32px; color:#fff;">
        <div style="max-width:480px; margin:0 auto; background:#1E1F22; border-radius:16px; padding:32px; text-align:center;">
          <p style="color:#F5C518; font-weight:700; letter-spacing:2px; font-size:12px; margin:0 0 16px;">CHAMA Nº 12</p>
          <h1 style="font-size:22px; margin:0 0 8px;">Redefinir senha</h1>
          <p style="color:#9CA3AF; font-size:14px; margin:0 0 24px;">
            Olá, ${name}. Use o código abaixo para redefinir sua senha de motorista.
            Ele expira em 10 minutos.
          </p>
          <div style="font-size:32px; font-weight:700; letter-spacing:8px; background:#0B0C0E; border-radius:12px; padding:16px; margin:0 0 24px;">
            ${code}
          </div>
          <p style="color:#6B7280; font-size:12px; margin:0;">
            Se você não pediu essa redefinição, ignore este email.
          </p>
        </div>
      </div>
    `;
  }
}
