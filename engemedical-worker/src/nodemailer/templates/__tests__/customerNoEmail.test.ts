import { customerNoEmailHtml } from '../html/customerNoEmail';

describe('customerNoEmail template', () => {
  test('should render template with valid parameters', () => {
    const result = customerNoEmailHtml('João Silva', 'Empresa LTDA', 'https://cmsocupacional.com.br/update');
    expect(result).toMatchSnapshot();
  });

  test('should escape HTML entities in parameters', () => {
    const result = customerNoEmailHtml('<script>alert("xss")</script>', 'Empresa LTDA', 'https://cmsocupacional.com.br/update');
    expect(result).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});