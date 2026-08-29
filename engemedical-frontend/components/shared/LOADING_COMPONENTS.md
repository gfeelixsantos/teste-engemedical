# Componentes de Loading - Engemedical

## PremiumCyberLoading

**Uso:** Loading premium para pós-login, com efeitos visuais avançados e impacto "wow".

### Características
- Background escuro com gradientes cyber
- Animação do logo hexagonal com rotação e glow
- Partículas animadas no fundo
- Texto com efeito reveal digital
- Progress bar animado
- Rings rotativos com gradientes da marca
- Corner accents para estética premium

### Props
```typescript
interface PremiumCyberLoadingProps {
  onComplete?: () => void;  // Callback ao completar o loading
  duration?: number;        // Duração em ms (default: 3000)
}
```

### Exemplo de Uso
```tsx
import PremiumCyberLoading from "@/components/shared/PremiumCyberLoading";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // ... lógica de login
  };

  if (isLoading) {
    return (
      <PremiumCyberLoading
        duration={3000}
        onComplete={() => router.push("/dashboard")}
      />
    );
  }

  return <LoginForm onSubmit={handleLogin} />;
}
```

---

## CustomAppLoading

**Uso:** Loading personalizado para uso geral na aplicação, elegante e consistente.

### Características
- Design limpo e moderno
- Logo com animação suave
- Ring rotativo com gradiente da marca
- Efeito de pulse/glow sutil
- Tamanhos configuráveis (sm, md, lg)
- Texto customizável
- Progress bar opcional
- Altura configurável (full ou compacto)

### Props
```typescript
interface CustomAppLoadingProps {
  title?: string;         // Título (default: "Carregando")
  description?: string;   // Descrição (default: "Aguarde um momento...")
  size?: "sm" | "md" | "lg";  // Tamanho (default: "md")
  fullHeight?: boolean;   // Altura total (default: true)
  showProgress?: boolean; // Mostrar progress bar (default: false)
}
```

### Exemplos de Uso

#### Loading Padrão
```tsx
import CustomAppLoading from "@/components/shared/CustomAppLoading";

<CustomAppLoading />
```

#### Loading com Título Personalizado
```tsx
<CustomAppLoading
  title="Carregando dados"
  description="Buscando informações do servidor..."
/>
```

#### Loading Compacto (sem altura total)
```tsx
<CustomAppLoading
  title="Processando"
  fullHeight={false}
  size="sm"
/>
```

#### Loading com Progress Bar
```tsx
<CustomAppLoading
  title="Sincronizando"
  description="Atualizando dados locais..."
  showProgress={true}
/>
```

#### Loading Grande
```tsx
<CustomAppLoading
  title="Inicializando Sistema"
  description="Configurando ambiente..."
  size="lg"
  showProgress={true}
/>
```

---

## Comparação dos Componentes

| Característica | PremiumCyberLoading | CustomAppLoading |
|----------------|---------------------|------------------|
| **Uso** | Pós-login, momentos especiais | Uso geral na aplicação |
| **Background** | Escuro, gradientes cyber | Branco, limpo |
| **Animações** | Avançadas, múltiplas camadas | Suaves, elegantes |
| **Partículas** | Sim | Não |
| **Progress** | Sim, automático | Opcional |
| **Customização** | Duração, callback | Tamanho, texto, altura |
| **Performance** | Médio (mais efeitos) | Alto (leve) |

---

## Cores da Marca

- **Verde Escuro:** `#104e35`
- **Verde Claro:** `#a6ce39`
- **Azul:** `#4a9eff`

Essas cores são usadas nos gradientes e efeitos dos componentes.

---

## Imagens Utilizadas

- `/images/engemedical_icone.png` - Logo hexagonal
- `/images/logo.png` - Logo completo (se necessário)

---

## Recomendações

1. **PremiumCyberLoading:** Use apenas em momentos especiais (pós-login, inicialização) para não sobrecarregar visualmente o usuário.

2. **CustomAppLoading:** Use para carregamentos frequentes dentro da aplicação (busca de dados, navegação entre páginas, etc.).

3. **Consistência:** Mantenha o padrão de uso em toda a aplicação para uma experiência de usuário coesa.
