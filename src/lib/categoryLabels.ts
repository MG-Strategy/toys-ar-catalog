// Maps exact Supabase `categoria` values → user-friendly display names
export const categoryDisplayName: Record<string, string> = {
  'Vehiculos': 'Vehículos',
  'Peluches': 'Peluches',
  'Muñecas': 'Muñecas',
  'Muñecos': 'Muñecos',
  'Juegos de Mesa': 'Juegos de Mesa',
  'bebes': 'Bebés',
  'Bebes': 'Bebés',
  'exterior': 'Exterior',
  'manualidades': 'Manualidades',
  'electronicos': 'Electrónicos',
  'juguetes_educativos': 'Juguetes Educativos',
  'Accion': 'Acción',
  'Didacticos': 'Didácticos',
  'otros': 'Otros',
};

export function getDisplayName(dbCategoria: string): string {
  return categoryDisplayName[dbCategoria] || dbCategoria;
}
