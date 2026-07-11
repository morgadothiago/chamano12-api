export interface IAuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ILoginResult {
  token: string;
  user: IAuthUser;
}
