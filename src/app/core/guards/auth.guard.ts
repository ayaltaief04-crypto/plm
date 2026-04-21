import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. Vérifie si l'utilisateur est connecté
  if (!auth.isLoggedIn()) {
    console.warn("🔐 Accès refusé : Utilisateur non connecté.");
    router.navigate(['/auth']);
    return false;
  }

  // 2. Récupération du rôle EXACT (ex: "Styliste" ou "Admin")
  const role = auth.getRole(); 
  const url = state.url; // On garde l'URL telle quelle ou on adapte la vérification

  console.log(`🛡️ GUARD : Rôle=[${role}] tente d'accéder à [${url}]`);

  // 3. Logique de protection par dossier/URL
  // On utilise .toLowerCase() seulement pour la recherche dans l'URL par sécurité,
  // mais on compare avec la chaîne exacte pour le rôle.

  if (url.toLowerCase().includes('/admin') && role !== 'Admin') {
    console.error("🚫 Accès refusé : Rôle Admin requis.");
    router.navigate(['/auth']); 
    return false;
  }

  if (url.toLowerCase().includes('/styliste') && role !== 'Styliste') {
    console.error("🚫 Accès refusé : Rôle Styliste requis.");
    router.navigate(['/auth']);
    return false;
  }

  return true;
};