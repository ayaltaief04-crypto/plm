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
  isEditMode = false;

  searchTerm: string = '';
  selectedRoleFilter: string = '';
  confirmPassword = '';

  userForm: User = this.emptyUser();
  passwordForm = { newPass: '', confirmPass: '' };

  displayedColumns = ['Nom', 'Email', 'Role', 'Statut', 'DateCreation'];

  readonly roleOptions = [
    { value: 'Styliste', label: 'Styliste / Designer' },
    { value: 'ResponsableMarketing', label: 'Responsable Marketing' },
    { value: 'Ingenieurtextile', label: 'Ingénieur Textile' },
    { value: 'ResponsableAchat', label: 'Responsable Achats' },
    { value: 'ResponsableQualite', label: 'Responsable Qualité' },
    { value: 'Admin', label: 'Administrateur' }
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
      error: (err) => console.error("Erreur chargement:", err)
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    this.filteredUsers = this.users.filter(u => {
      // Sécurisation : On s'assure que Nom et Email existent et sont des strings
      const nom = u.Nom ? String(u.Nom).toLowerCase() : '';
      const email = u.Email ? String(u.Email).toLowerCase() : '';
      
      const matchSearch = (nom + email).includes(term);
      const matchRole = this.selectedRoleFilter ? u.Role === this.selectedRoleFilter : true;
      
      return matchSearch && matchRole;
    });
  }

  selectRow(user: User, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedUser = (this.selectedUser?.IdUtilisateur === user.IdUtilisateur) ? null : user;
  }

  openAdd(): void {
    this.isEditMode = false;
    this.userForm = this.emptyUser();
    this.confirmPassword = '';
    this.showUserModal = true;
  }

  openEdit(): void {
    if (!this.selectedUser) return;
    this.isEditMode = true;
    this.userForm = { ...this.selectedUser };
    this.showUserModal = true;
  }

  saveUser(): void {
    if (!this.userForm.Nom || !this.userForm.Email) return;

    // Préparation de la date pour SQL Server
    const dateValue = this.userForm.DateCreation ? new Date(this.userForm.DateCreation) : new Date();

    const payload: User = {
      ...this.userForm,
      DateCreation: dateValue.toISOString(),
      MotDePasse: this.isEditMode 
        ? (this.userForm.MotDePasse || "") 
        : (this.userForm.MotDePasse || "")
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
        console.error("Erreur Backend:", err);
        alert("Erreur lors de l'enregistrement. Vérifiez la console.");
      }
    });
  }

  // --- GESTION MOT DE PASSE & SUPPRESSION ---

  openPasswordModal(): void {
    this.passwordForm = { newPass: '', confirmPass: '' };
    this.showPasswordModal = true;
  }

  confirmUpdatePassword(): void {
    if (!this.selectedUser?.IdUtilisateur) return;
    if (this.passwordForm.newPass !== this.passwordForm.confirmPass) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }

    this.userService.updatePassword(this.selectedUser.IdUtilisateur, this.passwordForm.newPass)
      .subscribe(() => {
        this.showPasswordModal = false;
        alert("Mot de passe mis à jour !");
      });
  }

  deleteUser(): void {
    if (this.selectedUser?.IdUtilisateur && confirm("Supprimer cet utilisateur ?")) {
      this.userService.deleteUser(this.selectedUser.IdUtilisateur).subscribe(() => {
        this.loadUsers();
        this.selectedUser = null;
      });
    }
  }

  private emptyUser(): User {
    return { 
      Nom: '', 
      Email: '', 
      Role: 'Styliste', 
      Actif: true, 
      DateCreation: new Date(), 
      MotDePasse: '' 
    };
  }
}