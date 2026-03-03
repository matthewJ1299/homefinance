export interface UserSummary {
  id: number;
  name: string;
}

export interface IUserRepository {
  findAll(): Promise<UserSummary[]>;
  findAllExcept(userId: number): Promise<UserSummary[]>;
  findById(id: number): Promise<UserSummary | null>;
}
