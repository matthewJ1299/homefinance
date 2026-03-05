export interface UserSummary {
  id: number;
  name: string;
}

export interface UserForAuth {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
}

export interface IUserRepository {
  findAll(): Promise<UserSummary[]>;
  findAllExcept(userId: number): Promise<UserSummary[]>;
  findById(id: number): Promise<UserSummary | null>;
  findByEmailForAuth(email: string): Promise<UserForAuth | null>;
}
