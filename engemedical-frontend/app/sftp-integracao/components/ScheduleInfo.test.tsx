/**
 * ScheduleInfo Component Tests
 *
 * Testes para o componente de informações de cronograma
 */

import { render, screen } from '@testing-library/react';
import { ScheduleInfo } from './ScheduleInfo';
import { SftpScheduleInfo } from '@/sftp-integracao/types';

describe('ScheduleInfo Component', () => {
  const defaultSchedule: SftpScheduleInfo = {
    cronExpression: '30 18 * * 1-5',
    cronEnabled: true,
    timezone: 'America/Sao_Paulo',
    lastExecution: '2026-09-10T18:30:00Z',
    nextExecution: '2026-09-11T18:30:00Z',
    description: 'Execução automática de segunda a sexta, às 18:30 (BRT)',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Enabled Schedule', () => {
    it('presents the schedule in language accessible to non-technical users', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText('Quando executamos')).toBeInTheDocument();
      expect(screen.getAllByText(defaultSchedule.description)).toHaveLength(2);
      expect(screen.queryByText('Cron Expression')).not.toBeInTheDocument();
    });

    it('should display schedule with cron enabled', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText('Cronograma de Execuções')).toBeInTheDocument();
    });

    it('should show active status badge', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });

    it('should display a human-readable execution rule', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText('Quando executamos')).toBeInTheDocument();
      expect(screen.getAllByText(defaultSchedule.description)).toHaveLength(2);
    });

    it('should display timezone', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText(/Timezone/i)).toBeInTheDocument();
      expect(screen.getByText('America/Sao_Paulo')).toBeInTheDocument();
    });

    it('should display last execution date and time', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText(/Última Execução/i)).toBeInTheDocument();
      expect(screen.getByText('10/09/2026 às 15:30')).toBeInTheDocument();
    });

    it('should display next execution date and time', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText(/Próxima Execução/i)).toBeInTheDocument();
    });
  });

  describe('Disabled Schedule', () => {
    const disabledSchedule: SftpScheduleInfo = {
      cronExpression: '',
      cronEnabled: false,
      timezone: 'America/Sao_Paulo',
      lastExecution: null,
      nextExecution: null,
      description: 'Execução desativada',
    };

    it('should show inactive status badge', () => {
      render(<ScheduleInfo schedule={disabledSchedule} />);

      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });

    it('should show cron disabled message', () => {
      render(<ScheduleInfo schedule={disabledSchedule} />);

      expect(screen.getByText('Execução desativada')).toBeInTheDocument();
    });

    it('should show no next execution for disabled schedule', () => {
      render(<ScheduleInfo schedule={disabledSchedule} />);

      expect(screen.getByText('Aguardando...')).toBeInTheDocument();
    });
  });

  describe('No Executions', () => {
    const noExecutionsSchedule: SftpScheduleInfo = {
      ...defaultSchedule,
      lastExecution: null,
      nextExecution: null,
    };

    it('should show no executions message when no last execution', () => {
      render(<ScheduleInfo schedule={noExecutionsSchedule} />);

      expect(screen.getByText('Nenhuma execução registrada')).toBeInTheDocument();
    });
  });

  describe('Info Footer', () => {
    it('should display schedule info footer', () => {
      render(<ScheduleInfo schedule={defaultSchedule} />);

      expect(screen.getByText(/O agendamento é acompanhado automaticamente/i)).toBeInTheDocument();
      expect(screen.getByText(/O agendamento é acompanhado automaticamente/i)).toBeInTheDocument();
    });
  });

  describe('Schedule Card Structure', () => {
    it('should render schedule card with correct structure', () => {
      const { container } = render(<ScheduleInfo schedule={defaultSchedule} />);

      // Card should exist
      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();

      // Header should exist
      expect(screen.getByText('Cronograma de Execuções')).toBeInTheDocument();
    });
  });
});
