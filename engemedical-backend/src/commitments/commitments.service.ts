import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../nodemailer/nodemailer.service';
import { IEmployeeCommitment, ICreateCommitmentDto, IUpdateCommitmentDto, VehicleType } from './interfaces/employee-commitment.interface';

@Injectable()
export class CommitmentsService {
  private readonly logger = new Logger(CommitmentsService.name);
  private readonly table = 'employee_commitments';

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async findAll(participant?: string, vehicle?: VehicleType): Promise<IEmployeeCommitment[]> {
    let query = this.client.from(this.table).select('*').order('start_time', { ascending: true });

    if (participant) {
      query = query.contains('participants', [participant]);
    }
    if (vehicle) {
      query = query.eq('vehicle', vehicle);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error('Erro ao buscar compromissos', error);
      throw error;
    }
    return data || [];
  }

  async findById(id: string): Promise<IEmployeeCommitment> {
    const { data, error } = await this.client.from(this.table).select('*').eq('id', id).single();
    if (error || !data) {
      throw new NotFoundException('Compromisso não encontrado');
    }
    return data;
  }

  async create(input: ICreateCommitmentDto): Promise<IEmployeeCommitment> {
    const vehicle = (input.vehicle && input.vehicle !== 'NENHUM' && input.vehicle !== 'null' && input.vehicle !== '') ? input.vehicle : null;
    if (vehicle) {
      await this.checkVehicleConflict(vehicle, input.start_time, input.end_time);
    }

    const payload = { ...input, vehicle };
    const { data, error } = await this.client.from(this.table).insert([payload]).select().single();
    if (error) {
      this.logger.error('Erro ao criar compromisso', error);
      throw new BadRequestException(error.message);
    }

    await this.sendCommitmentNotification(data);

    return data;
  }

  async update(id: string, input: IUpdateCommitmentDto): Promise<IEmployeeCommitment> {
    const existing = await this.findById(id);
    
    let vehicleToSave = input.vehicle;
    if (vehicleToSave === 'NENHUM' || vehicleToSave === 'null' || vehicleToSave === '') {
      vehicleToSave = null;
    }
    
    const newVehicle = vehicleToSave !== undefined ? vehicleToSave : (existing.vehicle as VehicleType | undefined);
    const newStart = input.start_time || existing.start_time;
    const newEnd = input.end_time || existing.end_time;

    if (newVehicle) {
      await this.checkVehicleConflict(newVehicle, newStart as string, newEnd as string, id);
    }

    const payload = { 
      ...input, 
      vehicle: vehicleToSave,
      updated_at: new Date().toISOString() 
    };

    const { data, error } = await this.client.from(this.table).update(payload).eq('id', id).select().single();
    if (error) {
      this.logger.error('Erro ao atualizar compromisso', error);
      throw new BadRequestException(error.message);
    }

    await this.sendCommitmentNotification(data);

    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq('id', id);
    if (error) {
      this.logger.error('Erro ao deletar compromisso', error);
      throw new BadRequestException(error.message);
    }
  }

  async findAvailableVehicles(start_time: string, end_time: string, excludeId?: string): Promise<VehicleType[]> {
    let query = this.client.from(this.table)
      .select('vehicle')
      .not('vehicle', 'is', null)
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error('Erro ao buscar veículos disponíveis', error);
      throw error;
    }

    const bookedVehicles = new Set(data.map(d => d.vehicle));
    const allVehicles = Object.values(VehicleType);
    return allVehicles.filter(v => !bookedVehicles.has(v));
  }

  private async checkVehicleConflict(vehicle: VehicleType, start: string, end: string, excludeId?: string): Promise<void> {
    let query = this.client
      .from(this.table)
      .select('id')
      .eq('vehicle', vehicle)
      .lt('start_time', end)
      .gt('end_time', start);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException('Erro ao verificar conflito de veículo');
    }

    if (data && data.length > 0) {
      throw new ConflictException(`O veículo ${vehicle} já está reservado para este horário.`);
    }
  }

  private async sendCommitmentNotification(commitment: IEmployeeCommitment): Promise<void> {
    const emails = commitment.emails_comunicado;
    if (!emails || emails.length === 0) return;

    const now = new Date();
    const startDate = new Date(commitment.start_time);
    const isToday = startDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = startDate.toDateString() === tomorrow.toDateString();

    try {
      await this.emailService.sendEmail({
        to: emails,
        subject: `Compromisso: ${commitment.title}`,
        templatename: 'COMMITMENT_NOTIFICATION',
        attachment: [],
        data: {
          commitmentInfo: {
            title: commitment.title,
            type: commitment.type,
            company: commitment.company,
            company_contact: commitment.company_contact,
            participants: commitment.participants || [],
            vehicle: commitment.vehicle,
            start_time: commitment.start_time as string,
            end_time: commitment.end_time as string,
            isToday,
            isTomorrow,
          },
        },
      });
      this.logger.log(`E-mail de notificação enfileirado para compromisso ${commitment.id}`);
    } catch (error) {
      this.logger.error(`Erro ao enfileirar e-mail para compromisso ${commitment.id}: ${error.message}`);
    }
  }
}
