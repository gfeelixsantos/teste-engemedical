"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';

export interface EmailBuilderRef {
  exportHtml: (callback: (data: { design: any; html: string }) => void) => void;
  loadDesign: (design: any) => void;
}

interface EmailBuilderProps {
  initialDesign?: any;
  onChange?: () => void;
}

export const EmailBuilder = forwardRef<EmailBuilderRef, EmailBuilderProps>(
  ({ initialDesign, onChange }, ref) => {
    const emailEditorRef = useRef<EditorRef>(null);

    const onReady: EmailEditorProps['onReady'] = (unlayer) => {
      if (initialDesign) {
        unlayer.loadDesign(initialDesign);
      }
      unlayer.addEventListener('design:updated', () => {
        onChange?.();
      });
    };

    useImperativeHandle(ref, () => ({
      exportHtml: (callback) => {
        emailEditorRef.current?.editor?.exportHtml((data) => {
          callback(data);
        });
      },
      loadDesign: (design) => {
        emailEditorRef.current?.editor?.loadDesign(design);
      },
    }));

    return (
      <div className="border border-default-200 rounded-md overflow-hidden bg-white h-[600px] w-full relative z-10">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={{
            locale: 'pt-BR',
            translations: {
              'en-US': {
                'tools.tabs.content': 'Conteúdo',
                'tools.tabs.blocks': 'Blocos',
                'tools.tabs.body': 'Corpo',
                'tools.tabs.images': 'Imagens',
                'tools.button.name': 'Botão',
                'tools.divider.name': 'Divisor',
                'tools.heading.name': 'Título',
                'tools.html.name': 'HTML',
                'tools.image.name': 'Imagem',
                'tools.menu.name': 'Menu',
                'tools.social.name': 'Redes Sociais',
                'tools.text.name': 'Texto',
                'tools.columns.name': 'Colunas',
                'tools.form.name': 'Formulário',
                'panels.content.title': 'Conteúdo',
                'panels.body.title': 'Propriedades do Corpo',
                'panels.settings.title': 'Configurações',
              },
              'pt-BR': {
                'tools.tabs.content': 'Conteúdo',
                'tools.tabs.blocks': 'Blocos',
                'tools.tabs.body': 'Corpo',
                'tools.tabs.images': 'Imagens',
                'tools.button.name': 'Botão',
                'tools.divider.name': 'Divisor',
                'tools.heading.name': 'Título',
                'tools.html.name': 'HTML',
                'tools.image.name': 'Imagem',
                'tools.menu.name': 'Menu',
                'tools.social.name': 'Redes Sociais',
                'tools.text.name': 'Texto',
                'tools.columns.name': 'Colunas',
                'tools.form.name': 'Formulário',
                'panels.content.title': 'Conteúdo',
                'panels.body.title': 'Propriedades do Corpo',
                'panels.settings.title': 'Configurações',
              }
            },
            appearance: {
              theme: 'modern_light',
            },
            features: {
              textEditor: {
                spellChecker: true,
              }
            }
          }}
          minHeight="600px"
        />
      </div>
    );
  }
);

EmailBuilder.displayName = "EmailBuilder";
