export type Rol = 'administrador' | 'encargado' | 'reponedor';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// Gestión de usuarios (solo administrador)
export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}
