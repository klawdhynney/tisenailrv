import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function obterIniciais(nomeOuEmail?: string | null): string {
  if (!nomeOuEmail) return "U";
  const limpo = nomeOuEmail.trim();
  if (!limpo) return "U";

  // Se for e-mail, extrai antes do @
  const partesNome = limpo.includes("@") ? limpo.split("@")[0] : limpo;
  const tokens = partesNome.split(/[\s._-]+/).filter(Boolean);

  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
  }
  if (tokens.length === 1 && tokens[0].length >= 2) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return (tokens[0]?.[0] || "U").toUpperCase();
}

interface UserAvatarProps {
  user?: User | null;
  session?: Session | null;
  fotoUrl?: string | null;
  nome?: string | null;
  email?: string | null;
  className?: string;
  sizeClassName?: string;
}

export function UserAvatar({
  user,
  session,
  fotoUrl,
  nome,
  email,
  className = "",
  sizeClassName = "size-8.5 sm:size-9",
}: UserAvatarProps) {
  const usuario = user || session?.user;
  const nomeEfetivo =
    nome ||
    usuario?.user_metadata?.full_name ||
    usuario?.user_metadata?.name ||
    email ||
    usuario?.email ||
    "Usuário";

  const emailEfetivo = email || usuario?.email || "";
  const iniciais = obterIniciais(nomeEfetivo || emailEfetivo);

  // Foto inicial (Google ou banco de dados)
  const fotoInicial =
    fotoUrl ||
    usuario?.user_metadata?.avatar_url ||
    usuario?.user_metadata?.picture ||
    null;

  const [src, setSrc] = useState<string | null>(fotoInicial);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  useEffect(() => {
    if (fotoInicial) {
      setSrc(fotoInicial);
      setErroCarregamento(false);
      return;
    }

    // Se não há foto mas temos sessão com token de provedor Microsoft (Azure)
    const provider = usuario?.app_metadata?.provider;
    const providerToken = session?.provider_token;
    const userId = usuario?.id;

    if (userId && (provider === "azure" || provider === "microsoft") && providerToken) {
      const cacheKey = `ms_avatar_${userId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setSrc(cached);
        return;
      }

      let ativo = true;
      fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      })
        .then(async (res) => {
          if (!res.ok) return null;
          const blob = await res.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        })
        .then((base64) => {
          if (ativo && base64) {
            sessionStorage.setItem(cacheKey, base64);
            setSrc(base64);
          }
        })
        .catch(() => {
          // Falha silenciosa: usa as iniciais
        });

      return () => {
        ativo = false;
      };
    }
  }, [fotoInicial, usuario?.id, usuario?.app_metadata?.provider, session?.provider_token]);

  return (
    <Avatar className={`relative shrink-0 ring-2 ring-border/80 shadow-xs cursor-pointer select-none transition-transform hover:scale-105 ${sizeClassName} ${className}`}>
      {src && !erroCarregamento ? (
        <AvatarImage
          src={src}
          alt={nomeEfetivo}
          onError={() => setErroCarregamento(true)}
          className="aspect-square h-full w-full object-cover rounded-full"
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs sm:text-sm flex items-center justify-center rounded-full border border-primary/20">
        {iniciais}
      </AvatarFallback>
    </Avatar>
  );
}
