import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;

  showUserModal = false;
  showPasswordModal = false;
  showDeleteModal = false;
  isEditMode = false;

  searchTerm: string = '';
  selectedRoleFilter: string = '';
  confirmPassword = '';

  // ✅ Filtres date de création
  dateDebutFilter: string = '';
  dateFinFilter: string = '';

  // ✅ Visibilité mot de passe
  showNewPass = false;
  showConfirmPass = false;

  userForm: User = this.emptyUser();
  passwordForm = { newPass: '', confirmPass: '' };

  formSubmitted = false;
  backendError  = '';

  displayedColumns = ['Nom', 'Email', 'Role', 'Statut', 'DateCreation'];

  readonly roleOptions = [
    { value: 'Styliste',             label: 'Styliste' },
    { value: 'ResponsableMarketing', label: 'Responsable Marketing' },
    { value: 'Ingenieurtextile',     label: 'Ingénieur Textile' },
    { value: 'ResponsableAchat',     label: 'Responsable Achats' },
    { value: 'ResponsableQualite',   label: 'Responsable Qualité' },
    { value: 'Admin',                label: 'Admin' }
  ];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        this.users = res;
        this.applyFilters();
      },
      error: (err) => console.error('Erreur chargement:', err)
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredUsers = this.users.filter(u => {
      // Filtre recherche texte
      const nom   = u.Nom   ? String(u.Nom).toLowerCase()   : '';
      const email = u.Email ? String(u.Email).toLowerCase() : '';
      const matchSearch = (nom + email).includes(term);

      // Filtre rôle
      const matchRole = this.selectedRoleFilter ? u.Role === this.selectedRoleFilter : true;

      // ✅ Filtre date de création
      let matchDate = true;
      if (this.dateDebutFilter || this.dateFinFilter) {
        const dateUser = u.DateCreation ? new Date(u.DateCreation) : null;
        if (dateUser) {
          if (this.dateDebutFilter) {
            const debut = new Date(this.dateDebutFilter);
            debut.setHours(0, 0, 0, 0);
            if (dateUser < debut) matchDate = false;
          }
          if (this.dateFinFilter) {
            const fin = new Date(this.dateFinFilter);
            fin.setHours(23, 59, 59, 999);
            if (dateUser > fin) matchDate = false;
          }
        } else {
          matchDate = false;
        }
      }

      return matchSearch && matchRole && matchDate;
    });
  }

  // ✅ Effacer le filtre date
  clearDateFilter(): void {
    this.dateDebutFilter = '';
    this.dateFinFilter   = '';
    this.applyFilters();
  }

  selectRow(user: User, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedUser = (this.selectedUser?.IdUtilisateur === user.IdUtilisateur) ? null : user;
  }

  openAdd(): void {
    this.isEditMode      = false;
    this.userForm        = this.emptyUser();
    this.confirmPassword = '';
    this.formSubmitted   = false;
    this.backendError    = '';
    this.showNewPass     = false;
    this.showConfirmPass = false;
    this.showUserModal   = true;
  }

  openEdit(): void {
    if (!this.selectedUser) return;
    this.isEditMode    = true;
    this.userForm      = { ...this.selectedUser };
    this.formSubmitted = false;
    this.backendError  = '';
    this.showUserModal = true;
  }

  isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim() || '');
  }

  saveUser(): void {
    this.formSubmitted = true;
    this.backendError  = '';

    // ✅ Un seul message global si un champ est manquant
    const nomValide     = !!this.userForm.Nom?.trim();
    const emailValide   = !!this.userForm.Email?.trim() && this.isEmailValid(this.userForm.Email);
    const roleValide    = !!this.userForm.Role;
    const mdpValide     = this.isEditMode || !!this.userForm.MotDePasse?.trim();
    const confirmValide = this.isEditMode || !!this.confirmPassword?.trim();
    const mdpIdentiques = this.isEditMode || this.userForm.MotDePasse === this.confirmPassword;

    if (!nomValide || !emailValide || !roleValide || !mdpValide || !confirmValide || !mdpIdentiques) {
      this.backendError = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    const dateValue = this.userForm.DateCreation
      ? new Date(this.userForm.DateCreation)
      : new Date();

    const payload: User = {
      ...this.userForm,
      DateCreation: dateValue.toISOString(),
      MotDePasse:   this.userForm.MotDePasse || ''
    };

    const request$ = this.isEditMode
      ? this.userService.updateUser(payload)
      : this.userService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.showUserModal = false;
        this.loadUsers();
        this.selectedUser = null;
      },
      error: (err) => {
        console.error('Erreur Backend:', err);
        const msg: string = err?.error?.message || err?.error || '';
        if (msg.toLowerCase().includes('email') || err.status === 409) {
          this.backendError = 'Cet email est déjà utilisé par un autre compte.';
        } else {
          this.backendError = 'Une erreur est survenue. Vérifiez vos données et réessayez.';
        }
      }
    });
  }

  openPasswordModal(): void {
    this.passwordForm = { newPass: '', confirmPass: '' };
    this.showPasswordModal = true;
  }

  confirmUpdatePassword(): void {
    if (!this.selectedUser?.IdUtilisateur) return;
    if (this.passwordForm.newPass !== this.passwordForm.confirmPass) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    this.userService.updatePassword(this.selectedUser.IdUtilisateur, this.passwordForm.newPass)
      .subscribe(() => {
        this.showPasswordModal = false;
        alert('Mot de passe mis à jour !');
      });
  }

  openDeleteConfirm(): void {
    if (this.selectedUser) {
      this.showDeleteModal = true;
    }
  }

  deleteUser(): void {
    if (this.selectedUser?.IdUtilisateur) {
      this.userService.deleteUser(this.selectedUser.IdUtilisateur).subscribe(() => {
        this.loadUsers();
        this.selectedUser    = null;
        this.showDeleteModal = false;
      });
    }
  }

  private emptyUser(): User {
    return {
      Nom:          '',
      Email:        '',
      Role:         '',
      Actif:        true,
      DateCreation: new Date(),
      MotDePasse:   ''
    };
  }
}