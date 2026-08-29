INSERT INTO public.units (nome, nome_exibicao, ordem, endereco, cidade, uf, cep, whatsapp, email, horario_funcionamento, qrcode_path, salas)
VALUES
  ('ARARAS', 'Araras', 1, 'Rua Coronel Justiniano, 509 - Centro', 'Araras', 'SP', '13600-700',
   '19982182200', 'agendamento.araras@cmsocupacional.com.br',
   'Segunda a sexta: 07:30 às 12:00', 'qrcode_localizacao_araras.jpg',
   '{"recepcao":["BALCÃO","FINALIZAÇÃO","GUICHÊ 1","GUICHÊ 2","GUICHÊ 3","GUICHÊ 4","GUICHÊ 5","GUICHÊ 6","GUICHÊ 7","GUICHÊ 8","GUICHÊ 9","GUICHÊ 10","GUICHÊ 11","GUICHÊ 12","RECEPÇÃO 1","RECEPÇÃO 2","RECEPÇÃO 3","PREPARO AGENDA"],"exames":["SALA 1","SALA 1 - LAB","SALA 1 - ESP","SALA 2","SALA 3-A","SALA 3-B","SALA 4","SALA 5-A","SALA 5-B","SALA 6-A","SALA 6-B","SALA 6-C","SALA 7","SALA 8","SALA 9","SALA 10","SALA 11","SALA 12","SALA 13","UNIDADE MÓVEL"]}'),
   ('CORDEIRÓPOLIS', 'Cordeirópolis', 2, 'Rua Guilherme Krauter, 507 - Centro', 'Cordeirópolis', 'SP', '13490-000',
    '19991750727', 'agendamento.cordeiro@cmsocupacional.com.br',
    'Segunda a quinta: 07:30 às 12:00 - 13:30 às 18:00<br>Sexta: 07:30 às 12:00 - 13:30 às 17:00',
    'qrcode_localizacao_cordeiropolis.jpg',
    '{"recepcao":["BALCÃO","FINALIZAÇÃO","GUICHÊ 1","GUICHÊ 2","GUICHÊ 3","GUICHÊ 4","GUICHÊ 5","GUICHÊ 6","GUICHÊ 7","GUICHÊ 8","GUICHÊ 9","GUICHÊ 10","GUICHÊ 11","GUICHÊ 12","RECEPÇÃO 1","RECEPÇÃO 2","RECEPÇÃO 3","PREPARO AGENDA"],"exames":["SALA 1","SALA 1 - LAB","SALA 1 - ESP","SALA 2","SALA 3-A","SALA 3-B","SALA 4","SALA 5-A","SALA 5-B","SALA 6-A","SALA 6-B","SALA 6-C","SALA 7","SALA 8","SALA 9","SALA 10","SALA 11","SALA 12","SALA 13","UNIDADE MÓVEL"]}'),
   ('RIO CLARO', 'Rio Claro', 3, 'Avenida Onze, 254 - Saúde', 'Rio Claro', 'SP', '13500-312',
    '19991363590', 'agendamento@cmsocupacional.com.br',
    'Segunda a quinta: 07:30 às 12:00 - 13:30 às 18:00<br>Sexta: 07:30 às 12:00 - 13:30 às 17:00<br>Sábado: 07:30 às 12:00',
    'qrcode_localizacao_rioclaro.jpg',
    '{"recepcao":["BALCÃO","FINALIZAÇÃO","GUICHÊ 1","GUICHÊ 2","GUICHÊ 3","GUICHÊ 4","GUICHÊ 5","GUICHÊ 6","GUICHÊ 7","GUICHÊ 8","GUICHÊ 9","GUICHÊ 10","GUICHÊ 11","GUICHÊ 12","RECEPÇÃO 1","RECEPÇÃO 2","RECEPÇÃO 3","PREPARO AGENDA"],"exames":["SALA 1","SALA 1 - LAB","SALA 1 - ESP","SALA 2","SALA 3-A","SALA 3-B","SALA 4","SALA 5-A","SALA 5-B","SALA 6-A","SALA 6-B","SALA 6-C","SALA 7","SALA 8","SALA 9","SALA 10","SALA 11","SALA 12","SALA 13","UNIDADE MÓVEL"]}')
ON CONFLICT (nome) DO NOTHING;
