export interface UserSummary {
  id: number;
  name: string;
}

export interface IUserRepository {
  findAll(): Promise<UserSummary[]>;
}
