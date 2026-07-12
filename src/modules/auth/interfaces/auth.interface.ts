export interface IAuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
}

export interface ILoginResult {
  token: string;
  user: IAuthUser;
}
