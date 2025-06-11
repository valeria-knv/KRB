import { createGlobalStyle } from 'styled-components';

export default createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: ${props => props.theme.colors.background};
    font-size: 14px;
    color: ${props => props.theme.colors.text};
    font-family: sans-serif;
  }

  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${(props) => props.theme.colors.primary};
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.colors.secundary};
    border-radius: 10px;
    transition: all 0.3s ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${(props) => props.theme.colors.secundaryHover};
  }

  ::-webkit-scrollbar-corner {
    background: ${(props) => props.theme.colors.primary};
  }

  /* Scrollbar Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${(props) => props.theme.colors.secundary} ${(props) => props.theme.colors.primary};
  }
`;