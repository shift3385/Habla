import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.shift.habla',
  appName: 'Habla',
  webDir: 'dist',
  // Sin registros del puente nativo: en las builds de depuración imprimían Ajustes (con las claves) y cabeceras HTTP.
  loggingBehavior: 'none',
}

export default config
