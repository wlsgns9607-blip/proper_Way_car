export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  birthDate?: string;
  phoneNumber?: string;
  carModel?: string;
  carSize?: string; // '경차', '승용차', 'SUV', '대형 SUV'
  carPhotoUrl?: string;
  photoURL?: string;
  provider?: string;
  createdAt: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
  roleLabel?: string;
  photoUrl?: string;
}

export interface AppState {
  user: UserProfile | null;
  loading: boolean;
  view: 'splash' | 'home' | 'auth' | 'chat' | 'guide' | 'loading' | 'photo_upload' | 'guide_query' | 'photo_upload_ai' | 'photo_upload_expert' | 'admin_dashboard' | 'review_matrix';
  modal: 'none' | 'service_choice' | 'location_permission' | 'searching_splash' | 'vehicle_config' | 'logout_confirm' | 'login_success';
  adminActiveSessionUid: string | null;
  pendingModal: 'vehicle_config' | 'login_success' | null;
}
