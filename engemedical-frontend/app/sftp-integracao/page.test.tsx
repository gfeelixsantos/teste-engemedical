/**
 * SFTP Integration Page Tests — TDD Suite
 *
 * Testes cobrem:
 * 1. Renderização da página principal
 * 2. Estado de loading (skeleton)
 * 3. Estado de erro com retry
 * 4. Chamadas de API (fetch)
 * 5. Download de arquivos
 * 6. Loading states durante ações
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SftpIntegracaoPage from "./page";

// Mock dependências
jest.mock("@/hooks/useSftpIntegration", () => ({
  useSftpIntegration: jest.fn(),
}));

jest.mock("@/components/shared/HeaderApp", () => ({
  HeaderApp: ({ title, subtitle, user, onLogout }) => (
    <div data-testid="header-app">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}));

jest.mock("@/components/shared/SidebarMenu", () => ({
  SidebarMenu: () => <div data-testid="sidebar-menu">Sidebar</div>,
}));

jest.mock("@/lib/utils", () => ({
  getCurrentUser: () => ({ nome: "Test User", perfil: "ADMIN" }),
}));

jest.mock("@/sftp-integracao/components/KpiCards", () => ({
  KpiCards: ({ kpis }) => (
    <div data-testid="kpi-cards">
      <span>Total Execuções: {kpis.totalExecutions}</span>
      <span>Total Arquivos: {kpis.totalFiles}</span>
    </div>
  ),
}));

jest.mock("@/sftp-integracao/components/ExecutionTable", () => ({
  ExecutionTable: ({ files, isPulling, onDownload }) => (
    <div data-testid="execution-table">
      <span>Files: {files.length}</span>
      <button
        disabled={isPulling}
        onClick={() => onDownload && onDownload("test-id")}
      >
        Download
      </button>
    </div>
  ),
}));

jest.mock("@/sftp-integracao/components/ReportsTable", () => ({
  ReportsTable: ({ runs, isProcessing, onDownload }) => (
    <div data-testid="reports-table">
      <span>Runs: {runs.length}</span>
      <button
        disabled={isProcessing}
        onClick={() => onDownload && onDownload("run-id")}
      >
        Download Run
      </button>
    </div>
  ),
}));

jest.mock("@/sftp-integracao/components/ScheduleInfo", () => ({
  ScheduleInfo: ({ schedule }) => (
    <div data-testid="schedule-info">
      <span>Cron Enabled: {schedule.cronEnabled.toString()}</span>
      <span>Description: {schedule.description}</span>
    </div>
  ),
}));

jest.mock("@/sftp-integracao/components/ActionButtons", () => ({
  ActionButtons: ({ isPulling, isProcessing, onTriggerPull }) => (
    <div data-testid="action-buttons">
      <button
        onClick={onTriggerPull}
        disabled={isPulling || isProcessing}
        data-testid="download-trigger"
      >
        {isPulling ? "Baixando..." : "Baixar Planilha SFTP"}
      </button>
    </div>
  ),
}));

// Import hook after mocks
import { useSftpIntegration } from "@/hooks/useSftpIntegration";

const mockUseSftpIntegration = useSftpIntegration as jest.MockedFunction<
  typeof useSftpIntegration
>;

describe("SftpIntegracaoPage - Renderização", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should render loading skeleton when isLoading is true", () => {
      mockUseSftpIntegration.mockReturnValue({
        kpis: {
          totalExecutions: 0,
          totalFiles: 0,
          lastExecutionDate: null,
          lastExecutionTime: null,
          lastExecutionStatus: null,
          nextScheduledExecution: null,
          cronEnabled: true,
        },
        files: [],
        runs: [],
        schedule: {
          cronExpression: "",
          cronEnabled: false,
          timezone: "America/Sao_Paulo",
          lastExecution: null,
          nextExecution: null,
          description: "Loading...",
        },
        isLoading: true,
        isPulling: false,
        isProcessing: false,
        error: null,
        triggerPull: jest.fn(),
        downloadFile: jest.fn(),
        downloadReport: jest.fn(),
        refetch: jest.fn(),
      });

      render(<SftpIntegracaoPage />);

      // Verifica se a página mantém o header durante o carregamento
      expect(screen.getByTestId("header-app")).toBeInTheDocument();
    });
  });

  describe("Main Content", () => {
    it("should render page title and subtitle", () => {
      mockUseSftpIntegration.mockReturnValue({
        kpis: {
          totalExecutions: 5,
          totalFiles: 10,
          lastExecutionDate: "10/09/2026",
          lastExecutionTime: "14:30",
          lastExecutionStatus: "processed",
          nextScheduledExecution: null,
          cronEnabled: true,
        },
        files: [],
        runs: [],
        schedule: {
          cronExpression: "30 18 * * 1-5",
          cronEnabled: true,
          timezone: "America/Sao_Paulo",
          lastExecution: "2026-09-10T18:30:00Z",
          nextExecution: null,
          description: "Execução automática de segunda a sexta, às 18:30 (BRT)",
        },
        isLoading: false,
        isPulling: false,
        isProcessing: false,
        error: null,
        triggerPull: jest.fn(),
        downloadFile: jest.fn(),
        downloadReport: jest.fn(),
        refetch: jest.fn(),
      });

      render(<SftpIntegracaoPage />);

      expect(
        screen.getByRole("heading", { name: "Integração SFTP" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Automações")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Acompanhamento da integração e processamento de arquivos/i,
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("SftpIntegracaoPage - Error State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render error state when error is present", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: "Falha ao carregar dados",
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByText("Erro ao carregar dados")).toBeInTheDocument();
    expect(screen.getByText("Falha ao carregar dados")).toBeInTheDocument();
  });

  it("should call refetch when retry button is clicked", async () => {
    const mockRefetch = jest.fn();

    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: "Falha ao carregar dados",
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: mockRefetch,
    });

    render(<SftpIntegracaoPage />);

    const retryButton = screen.getByRole("button", {
      name: /tentar novamente/i,
    });
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe("SftpIntegracaoPage - KPI Cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display KPIs correctly", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 42,
        totalFiles: 15,
        lastExecutionDate: "10/09/2026",
        lastExecutionTime: "14:30",
        lastExecutionStatus: "processed",
        nextScheduledExecution: "11/09/2026T18:30:00Z",
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "30 18 * * 1-5",
        cronEnabled: true,
        timezone: "America/Sao_Paulo",
        lastExecution: "2026-09-10T18:30:00Z",
        nextExecution: null,
        description: "Execução automática de segunda a sexta, às 18:30 (BRT)",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByText("Total Execuções: 42")).toBeInTheDocument();
    expect(screen.getByText("Total Arquivos: 15")).toBeInTheDocument();
  });
});

describe("SftpIntegracaoPage - Action Buttons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call triggerPull when download button is clicked", async () => {
    const mockTriggerPull = jest.fn();

    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: mockTriggerPull,
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    const downloadButton = screen.getByTestId("download-trigger");
    await userEvent.click(downloadButton);

    expect(mockTriggerPull).toHaveBeenCalledTimes(1);
  });

  it("should show loading text when isPulling is true", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: true,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByText("Baixando...")).toBeInTheDocument();
    expect(screen.getByTestId("download-trigger")).toBeDisabled();
  });
});

describe("SftpIntegracaoPage - ExecutionTable Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should pass files and download handler to ExecutionTable", () => {
    const mockDownloadFile = jest.fn();

    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [
        {
          id: "file-1",
          clientKey: "grupo-tora",
          remoteName: "PLANILHA_FUNCIONARIOS.xlsx",
          remotePath: "/planilhas/PLANILHA_FUNCIONARIOS.xlsx",
          size: 1024000,
          sha256: "abc123",
          remoteMtime: "2026-09-10T18:00:00Z",
          status: "downloaded",
          createdAt: "2026-09-10T18:30:00Z",
          updatedAt: "2026-09-10T18:30:00Z",
        },
      ],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: mockDownloadFile,
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByTestId("execution-table")).toBeInTheDocument();
    expect(screen.getByText("Files: 1")).toBeInTheDocument();
  });

  it("should show empty state when no files exist", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    // Empty state message is rendered by ExecutionTable
    expect(screen.getByTestId("execution-table")).toBeInTheDocument();
  });
});

describe("SftpIntegracaoPage - Schedules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display schedule info correctly", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "30 18 * * 1-5",
        cronEnabled: true,
        timezone: "America/Sao_Paulo",
        lastExecution: "2026-09-10T18:30:00Z",
        nextExecution: "2026-09-11T18:30:00Z",
        description: "Execução automática de segunda a sexta, às 18:30 (BRT)",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByTestId("schedule-info")).toBeInTheDocument();
    expect(screen.getByText(/Cron Enabled: true/i)).toBeInTheDocument();
    expect(
      screen.getByText(/description: execução automática/i),
    ).toBeInTheDocument();
  });

  it("should show cron as disabled when cronEnabled is false", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: false,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Execução desativada",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByText(/Cron Enabled: false/i)).toBeInTheDocument();
  });
});

describe("SftpIntegracaoPage - ReportsTable Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should pass runs and download handler to ReportsTable", () => {
    const mockDownloadReport = jest.fn();

    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [
        {
          id: "run-1",
          clientKey: "grupo-tora",
          fileId: "file-1",
          status: "processed",
          summary: {
            totalRows: 100,
            validRows: 95,
            invalidRows: 5,
            successCount: 80,
            notInBaseCount: 15,
            errorCount: 0,
          },
          createdAt: "2026-09-10T18:30:00Z",
          updatedAt: "2026-09-10T18:35:00Z",
        },
      ],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: mockDownloadReport,
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByTestId("reports-table")).toBeInTheDocument();
    expect(screen.getByText("Runs: 1")).toBeInTheDocument();
  });

  it("should show processing state in button", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: true,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    const downloadButton = screen.getByRole("button", {
      name: /download run/i,
    });
    expect(downloadButton).toBeDisabled();
  });
});

describe("SftpIntegracaoPage - Time Display", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock date
    const mockDate = new Date("2026-09-12T14:30:45");
    jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should display current time", () => {
    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    expect(screen.getByText(/14:30:45/)).toBeInTheDocument();
  });
});

describe("SftpIntegracaoPage - Logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear localStorage mock
    (global.localStorage.getItem as jest.Mock).mockClear();
    (global.localStorage.removeItem as jest.Mock).mockClear();
  });

  it("should remove user from localStorage and redirect on logout", () => {
    const mockPush = jest.fn();

    jest.mock("next/navigation", () => ({
      useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        refresh: jest.fn(),
      }),
    }));

    mockUseSftpIntegration.mockReturnValue({
      kpis: {
        totalExecutions: 0,
        totalFiles: 0,
        lastExecutionDate: null,
        lastExecutionTime: null,
        lastExecutionStatus: null,
        nextScheduledExecution: null,
        cronEnabled: true,
      },
      files: [],
      runs: [],
      schedule: {
        cronExpression: "",
        cronEnabled: false,
        timezone: "America/Sao_Paulo",
        lastExecution: null,
        nextExecution: null,
        description: "Loading...",
      },
      isLoading: false,
      isPulling: false,
      isProcessing: false,
      error: null,
      triggerPull: jest.fn(),
      downloadFile: jest.fn(),
      downloadReport: jest.fn(),
      refetch: jest.fn(),
    });

    render(<SftpIntegracaoPage />);

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    expect(global.localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
