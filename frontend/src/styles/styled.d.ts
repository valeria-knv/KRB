import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    title: string;
  
    colors: {
      primary: string;
      primaryHover: string;
      secundary: string;
      secundaryHover: string;

      background: string;
      text: string;

      accent: string;
      accentDark: string;
    }  
  }
}