INSERT INTO public.exames (grupo, nome, codigos, status_finalizacao, enviar_para_azure, requer_assinatura, template_key, estimativa_minutos) VALUES
  -- Exame Clínico
  ('Exame Clínico', 'Exame Clínico',             '{clinico,11}',          'FINALIZADO', true,  true,  'exameClinico', 25),
  ('Exame Clínico', 'Teste de Romberg',           '{002211}',              'FINALIZADO', false, false, NULL,           NULL),

  -- Audiometria
  ('Audiometria',   'Audiometria',               '{51.01.004-6,50c,10014}','FINALIZADO', true,  true,  'audiometria',  18),
  ('Audiometria',   'Avaliação Acústica da Voz',  '{28032024}',            'AGUARDANDO_RESULTADO', false, false, NULL, NULL),
  ('Audiometria',   'Audiometria tonal ocupacional', '{0281}',            'FINALIZADO', true,  true,  'audiometria',  18),

  -- Acuidade Visual
  ('Acuidade Visual', 'Acuidade Visual',          '{50.01.001-8,20221407,4447,02002,4445}', 'FINALIZADO', true,  false, 'acuidade', 15),
  ('Acuidade Visual', 'Consulta Oftalmológica',    '{07072023}',            'AGUARDANDO_RESULTADO', false, false, NULL, NULL),
  ('Acuidade Visual', 'Avaliação da acuidade visual com colorimetria (Ishihara)', '{0298}', 'FINALIZADO', true,  false, NULL, 15),

  -- Laboratório
  ('Laboratório',   '2,5-hexanodiona urinária',              '{2}',              'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Acetona urinária',                      '{XX}',             'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido delta aminolevulínico - ALA-U',   '{28.15.001-5}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido fenilglioxílico',                 '{28.15.003-1}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido hipúrico',                        '{28.15.004-0}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido mandélico',                       '{28.15.005-8}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido metilhipúrico',                   '{28.15.006-6}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido trans, trans-mucônico',           '{5555}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Ácido úrico',                            '{28010175}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Antígeno específico prostático total (PSA)', '{1180}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Cádmio Sanguíneo',                       '{CÁDMIO}',         'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Cádmio urinários',                      '{001234}',         'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Carboxihemoglobina',                     '{28.15.009-0}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Chumbo sanguíneo',                       '{28.15.012-0}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Chumbo urinário',                        '{0012345}',        'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Colesterol (HDL)',                       '{1332}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Colesterol (LDL)',                       '{1222}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Colesterol (VLDL)',                      '{00000}',          'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Colesterol total',                       '{28010507}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Creatinina',                              '{28.01.054-0}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Cromo sanguíneo',                        '{02}',             'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Cultura nas fezes',                      '{28100239}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Etanol',                                  '{28.15.030-9}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Fenol',                                   '{28.15.014-7}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Fluoreto urinário',                       '{28.15.015-5}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Função hepática',                         '{11072025}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Fungos, pesquisa a fresco',              '{002000}',         'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Gama-glutamil transferase (Gama-GT)',    '{28.01.095-7}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Glicemia',                                '{28.01.097-3}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Grupo sanguíneo ABO, e fator Rho (inclui Du)', '{2336,28040350}', 'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hemoglobina glicada (A1 total)',         '{28011023}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hemograma com contagem de plaquetas ou frações', '{28.04.048-1,28040562}', 'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite A - HAV - IgG',                 '{28060105}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite A - HAV - IgM',                 '{28060113}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite B - HBCAC - IgG',               '{28060067}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite B - HBCAC - IgM',               '{28061195}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite B - HBeAC (anti HBE)',          '{-}',              'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite B - HBsAG',                     '{144}',            'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite B - HBsAC (anti-HBs)',          '{1123}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite C - anti-HCV - IgG',            '{00022}',          'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hepatite C - anti-HCV - IgM',            '{1125}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Hormônio gonodotrofico corionico',       '{200}',            'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Metanol',                                 '{28.15.018-0}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Metil Etil Cetona',                       '{1,54778844}',     'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'N-Metilformamida',                        '{UNESP}',          'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Parasitológico de fezes',                 '{28030141}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Reticulócitos',                           '{0101}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Rotina de urina',                         '{28.13.036-7,47788855}', 'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Sífilis - VDRL',                          '{28061004}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Exame Toxicológico',                      '{02020}',          'FINALIZADO', false, false, NULL, 22),
  ('Laboratório',   'TGO',                                     '{28.01.136-8}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'TGP',                                     '{28.01.137-6}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Tolueno sanguíneo',                       '{13012023}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Tolueno urinário',                        '{09022023}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Triglicerídeos',                          '{28011392}',       'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Uréia',                                   '{28.01.141-4}',    'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Estireno na urina',                       '{1427}',           'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Micológico de unha',                      '{}',               'AGUARDANDO_RESULTADO', false, false, NULL, 22),
  ('Laboratório',   'Secreção Orofaringe e Nasal',             '{}',               'AGUARDANDO_RESULTADO', false, false, NULL, 22),

  -- ECG
  ('ECG',           'ECG',                                      '{20.01.001-0}',    'AGUARDANDO_RESULTADO', false, false, NULL, 25),

  -- EEG
  ('EEG',           'EEG',                                      '{22010017}',       'AGUARDANDO_RESULTADO', false, false, NULL, 40),

  -- Psicossocial
  ('Psicossocial',  'Psicossocial',                             '{225588,00123,111114}', 'FINALIZADO', true, false, 'psicossocial', 22),

  -- Espirometria
  ('Espirometria',  'Espirometria',                             '{19.01.029-0}',    'AGUARDANDO_RESULTADO', true,  false, 'espirometria', 18),

  -- Raio-X
  ('Raio-X',        'Radiografia de tórax (PA) Padrão OIT',     '{32050070,14111}', 'AGUARDANDO_RESULTADO', false, false, NULL, 50),
  ('Raio-X',        'Radiografia de coluna total',              '{ex imagem}',      'AGUARDANDO_RESULTADO', false, false, NULL, 50),
  ('Raio-X',        'Radiografia de coluna lombo-sacra',        '{111,1v1v,254477}','AGUARDANDO_RESULTADO', false, false, NULL, 50),
  ('Raio-X',        'Radiografia de coluna dorsal',             '{-0-}',            'AGUARDANDO_RESULTADO', false, false, NULL, 50),
  ('Raio-X',        'Radiografia de coluna cervical',           '{0..}',            'AGUARDANDO_RESULTADO', false, false, NULL, 50),
  ('Raio-X',        'Métodos Diagnósticos por Imagem Coluna',   '{2221111}',        'AGUARDANDO_RESULTADO', false, false, NULL, 50),

  -- Tomografia (grupo separado)
  ('Tomografia',    'Tomografia de tórax',                      '{12200,8998}',     'AGUARDANDO_RESULTADO', false, false, NULL, 50),

  -- Dinamometria (1 exame com 5 códigos)
  ('Dinamometria',  'Dinamometria',                             '{20,58877,041120251,041120252,041120253}', 'FINALIZADO', true, false, 'dinamometria', NULL),

  -- Ultrassom
  ('Ultrassom',     'Ultrassom',                                '{1444,587744}',    'FINALIZADO', true,  false, NULL, NULL),

  -- Triagem
  ('Triagem',       'Triagem',                                  '{triagem}',        'FINALIZADO', true,  false, NULL, 10)
ON CONFLICT DO NOTHING;
