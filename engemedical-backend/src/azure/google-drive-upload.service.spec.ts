import { GoogleDriveUploadService } from './google-drive-upload.service';

describe('GoogleDriveUploadService', () => {
  const baseScheduling = {
    _id: '65f0a5d9f0c2f63f84f0a111',
    NOME: 'Paciente Teste',
    NOMEEMPRESA: 'Empresa Teste',
    TIPOEXAMENOME: 'PERIODICO',
    DATAAGENDAMENTO: '30/03/2026',
    NOMECARGO: '',
    NOMESETOR: '',
    ASOINFO: {
      status: 'LIBERADO',
      url: 'https://blob.local/funcionarios/2026/123/ASO_SIGNED_1.pdf',
    },
  };

  const makeMocks = () => {
    const schedulingSnapshot = JSON.parse(JSON.stringify(baseScheduling));

    const mongoService = {
      schedulingsCollection: {
        findOne: jest.fn().mockResolvedValue(schedulingSnapshot),
        updateOne: jest
          .fn()
          .mockResolvedValueOnce({ modifiedCount: 1 })
          .mockResolvedValue({ acknowledged: true }),
      },
    };

    const azureService = {
      downloadBlob: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };

    const googleDriveService = {
      isEnabled: jest.fn().mockReturnValue(true),
      uploadFromBuffer: jest.fn().mockResolvedValue('drive-file-id'),
    };

    const service = new GoogleDriveUploadService(
      mongoService as any,
      azureService as any,
      googleDriveService as any,
    );

    return { service, mongoService, azureService, googleDriveService };
  };

  it('nao deve subir arquivo de atendimento credenciada', async () => {
    const { service, mongoService, azureService, googleDriveService } =
      makeMocks();

    mongoService.schedulingsCollection.findOne.mockResolvedValueOnce({
      ...baseScheduling,
      NOMECARGO: 'KIT CREDENCIADA',
    });

    await service.processAsoUpload({
      schedulingId: String(baseScheduling._id),
      documentType: 'ASO',
      url: baseScheduling.ASOINFO.url,
    });

    expect(googleDriveService.uploadFromBuffer).not.toHaveBeenCalled();
    expect(azureService.downloadBlob).not.toHaveBeenCalled();
    expect(mongoService.schedulingsCollection.updateOne).not.toHaveBeenCalled();
  });

  it('nao deve duplicar upload quando o fileId ja existe', async () => {
    const { service, mongoService, azureService, googleDriveService } =
      makeMocks();

    mongoService.schedulingsCollection.findOne.mockResolvedValueOnce({
      ...baseScheduling,
      ASOINFO: {
        ...baseScheduling.ASOINFO,
        googleDrive: {
          fileId: 'ja-enviado',
        },
      },
    });

    await service.processAsoUpload({
      schedulingId: String(baseScheduling._id),
      documentType: 'ASO',
      url: baseScheduling.ASOINFO.url,
    });

    expect(googleDriveService.uploadFromBuffer).not.toHaveBeenCalled();
    expect(azureService.downloadBlob).not.toHaveBeenCalled();
    expect(mongoService.schedulingsCollection.updateOne).not.toHaveBeenCalled();
  });

  it('deve baixar do blob, subir no drive e persistir metadata', async () => {
    const { service, mongoService, azureService, googleDriveService } =
      makeMocks();

    await service.processAsoUpload({
      schedulingId: String(baseScheduling._id),
      documentType: 'ASO',
      url: baseScheduling.ASOINFO.url,
    });

    expect(azureService.downloadBlob).toHaveBeenCalledWith(
      baseScheduling.ASOINFO.url,
    );
    expect(googleDriveService.uploadFromBuffer).toHaveBeenCalledWith(
      expect.stringMatching(/^ASO_/),
      expect.any(Buffer),
    );
    expect(mongoService.schedulingsCollection.updateOne).toHaveBeenCalledTimes(
      2,
    );
  });
});
