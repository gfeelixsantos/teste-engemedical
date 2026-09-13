/**
 * ActionButtons Component Tests
 *
 * Testes para o componente de botões de ação
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ActionButtons } from "./ActionButtons";

describe("ActionButtons Component", () => {
  const defaultProps = {
    isPulling: false,
    isProcessing: false,
    onTriggerPull: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Renderização Básica", () => {
    it("should render all action buttons", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByText("Baixar Planilha SFTP")).toBeInTheDocument();
      expect(screen.getByText("Atualizar")).toBeInTheDocument();
    });

    it("should render status indicator section", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByText("Status da Integração")).toBeInTheDocument();
    });

    it("should render the operational integration status", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(
        screen.getByText("Pronta para nova sincronização"),
      ).toBeInTheDocument();
      expect(screen.getByText("Operacional")).toBeInTheDocument();
    });
  });

  describe("Download Trigger Button", () => {
    it("should call onTriggerPull when clicked", () => {
      render(<ActionButtons {...defaultProps} />);

      const downloadButton = screen.getByText("Baixar Planilha SFTP");
      fireEvent.click(downloadButton);

      expect(defaultProps.onTriggerPull).toHaveBeenCalledTimes(1);
    });

    it("should show loading text when isPulling is true", () => {
      render(<ActionButtons {...defaultProps} isPulling={true} />);

      expect(screen.getByText("Baixando...")).toBeInTheDocument();
    });

    it("should disable button when isPulling is true", () => {
      render(<ActionButtons {...defaultProps} isPulling={true} />);

      const downloadButton = screen.getByRole("button", { name: /baixar/i });
      expect(downloadButton).toBeDisabled();
    });
  });

  describe("Refresh Button", () => {
    it("should be disabled when isPulling is true", () => {
      render(<ActionButtons {...defaultProps} isPulling={true} />);

      const refreshButton = screen.getByText("Atualizar");
      expect(refreshButton).toBeDisabled();
    });

    it("should be disabled when isProcessing is true", () => {
      render(<ActionButtons {...defaultProps} isProcessing={true} />);

      const refreshButton = screen.getByText("Atualizar");
      expect(refreshButton).toBeDisabled();
    });
  });

  describe("Loading States", () => {
    it("should disable all buttons when isPulling is true", () => {
      render(<ActionButtons {...defaultProps} isPulling={true} />);

      expect(screen.getByRole("button", { name: /baixar/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /atualizar/i })).toBeDisabled();
    });

    it("should disable all buttons when isProcessing is true", () => {
      render(<ActionButtons {...defaultProps} isProcessing={true} />);

      expect(screen.getByRole("button", { name: /baixar/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /atualizar/i })).toBeDisabled();
    });

    it("should show both disabled simultaneously", () => {
      render(
        <ActionButtons
          {...defaultProps}
          isPulling={true}
          isProcessing={true}
        />,
      );

      const downloadButton = screen.getByRole("button", { name: /baixar/i });
      expect(downloadButton).toBeDisabled();
      expect(downloadButton).toHaveText("Baixando...");
    });
  });

  describe("Refresh Action", () => {
    it("should call the refresh callback when provided", () => {
      const onRefresh = jest.fn();
      render(<ActionButtons {...defaultProps} onRefresh={onRefresh} />);

      fireEvent.click(screen.getByRole("button", { name: /atualizar/i }));

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("Layout", () => {
    it("should render buttons in flex row", () => {
      const { container } = render(<ActionButtons {...defaultProps} />);

      const buttonContainer = container.querySelector(
        ".flex-col.sm\\:flex-row",
      );
      expect(buttonContainer).toBeInTheDocument();
    });

    it("should render stat summary section", () => {
      const { container } = render(<ActionButtons {...defaultProps} />);

      const summaryContainer = container.querySelector(".flex-1");
      expect(summaryContainer).toBeInTheDocument();
    });
  });

  describe("Spinning Animation", () => {
    it("should show spinning refresh icon when pulling", () => {
      render(<ActionButtons {...defaultProps} isPulling={true} />);

      const refreshButton = screen.getByText("Atualizar");
      expect(refreshButton.querySelector("svg")).toBeInTheDocument();
    });
  });
});
