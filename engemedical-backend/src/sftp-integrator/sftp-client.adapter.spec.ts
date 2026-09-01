import {
  fingerprintBase64FromHex,
  fingerprintHex,
  fingerprintKey,
} from './sftp-client.adapter';

describe('SFTP fingerprint helpers', () => {
  it('normalizes OpenSSH SHA256 fingerprints without padding', () => {
    expect(
      fingerprintKey('SHA256:KkxklQCpBay+tv5vdriZR/yFjRnyq3XOWN0A9++bafY='),
    ).toBe('kkxklqcpbay+tv5vdrizr/yfjrnyq3xown0a9++bafy');
  });

  it('converts OpenSSH base64 fingerprint to the hex hash used by ssh2', () => {
    expect(
      fingerprintHex('SHA256:KkxklQCpBay+tv5vdriZR/yFjRnyq3XOWN0A9++bafY'),
    ).toBe('2a4c649500a905acbeb6fe6f76b89947fc858d19f2ab75ce58dd00f7ef9b69f6');
  });

  it('converts ssh2 hex hash back to a comparable OpenSSH base64 fingerprint', () => {
    expect(
      fingerprintBase64FromHex(
        '2a4c649500a905acbeb6fe6f76b89947fc858d19f2ab75ce58dd00f7ef9b69f6',
      ),
    ).toBe('kkxklqcpbay+tv5vdrizr/yfjrnyq3xown0a9++bafy');
  });
});
