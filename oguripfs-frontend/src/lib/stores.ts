import { writable } from 'svelte/store';

interface User {
  id: string;
  username: string;
  email: string;
  plan: string;
}

export const user = writable<User | null>(null);
export const token = writable<string | null>(null);

// Inicializar desde localStorage si existe
if (typeof window !== 'undefined') {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  
  if (savedToken) token.set(savedToken);
  if (savedUser) user.set(JSON.parse(savedUser));
}

// Guardar en localStorage cuando cambian
token.subscribe((value) => {
  if (typeof window === 'undefined') return;
  if (value) localStorage.setItem('token', value);
  else localStorage.removeItem('token');
});

user.subscribe((value) => {
  if (typeof window === 'undefined') return;
  if (value) localStorage.setItem('user', JSON.stringify(value));
  else localStorage.removeItem('user');
});

export const logout = () => {
  user.set(null);
  token.set(null);
};