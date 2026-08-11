export const COUNTRIES = [
  { code: 'all', name: 'Todos los países', flag: '🌍' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'RU', name: 'Rusia', flag: '🇷🇺' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
]

export const HOBBIES = [
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'musica', label: 'Música', icon: '🎵' },
  { id: 'arte', label: 'Arte', icon: '🎨' },
  { id: 'futbol', label: 'Fútbol', icon: '⚽' },
  { id: 'cine', label: 'Cine', icon: '🎬' },
  { id: 'cocina', label: 'Cocina', icon: '🍳' },
  { id: 'viajes', label: 'Viajes', icon: '✈️' },
  { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { id: 'fotografia', label: 'Fotografía', icon: '📷' },
  { id: 'lectura', label: 'Lectura', icon: '📚' },
  { id: 'baile', label: 'Baile', icon: '💃' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
]

export function getCountryFlag(code: string): string {
  if (code === 'all') return '🌍'
  const country = COUNTRIES.find((c) => c.code === code)
  return country?.flag || '🏳️'
}

export function getCountryName(code: string): string {
  if (code === 'all') return 'Todos los países'
  const country = COUNTRIES.find((c) => c.code === code)
  return country?.name || 'Desconocido'
}

export function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'Hombre': return '👨 Hombre'
    case 'Mujer': return '👩 Mujer'
    case 'Trans': return '⚧ Trans'
    default: return gender
  }
}

export function getGenderShort(gender: string): string {
  switch (gender) {
    case 'Hombre': return '👨'
    case 'Mujer': return '👩'
    case 'Trans': return '⚧'
    default: return ''
  }
}
