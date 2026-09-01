
INSERT INTO public.user_signature_settings (user_codigo, assinatura_imagem_url, assina_digitalmente, created_at, updated_at)
VALUES
  ('450', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/450.png?a=1761172638989', false, now(), now()),
  ('1301', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1301.png?b=1760840095521', false, now(), now()),
  ('1136', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1136.png?b=1761172713152', false, now(), now()),
  ('980', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/980.png?b=1761258823894', false, now(), now()),
  ('1407', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1407.png?b=1761258895541', false, now(), now()),
  ('1006', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1006.png?b=1761172764932', false, now(), now()),
  ('1', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1.png?b=1761172814105', false, now(), now()),
  ('1400', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1400.png?b=1761172864124', false, now(), now()),
  ('1517', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1517.png?b=1761172902774', false, now(), now()),
  ('1594', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1594.png?b=1761173020721', false, now(), now()),
  ('1591', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1591.png?b=1765894395897', false, now(), now()),
  ('1702', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1702.png?b=1769535426562', false, now(), now()),
  ('1704', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1704.png?b=1770747540106', false, now(), now()),
  ('1461', 'https://sistema.soc.com.br/estatico/upload/empresas/1153506/pessoa/1461.png?b=1771510013065', false, now(), now())
ON CONFLICT (user_codigo) 
DO UPDATE SET 
  assinatura_imagem_url = EXCLUDED.assinatura_imagem_url,
  updated_at = now();

