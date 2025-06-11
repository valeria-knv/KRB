import styled from 'styled-components';

export const Container = styled.div`
  height: 60px;
  background: ${props => props.theme.colors.primary};
  color: #FFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
`;

export const ControlsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

export const Navigation = styled.nav`
  display: flex;
  gap: 1rem;
`

export const NavButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background: ${(props) => (props.active ? props.theme.colors.secundary : "transparent")};
  color: ${(props) => (props.active ? "white" : props.theme.colors.text)};
  border: 1px solid ${(props) => (props.active ? props.theme.colors.secundary : "transparent")};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.active ? props.theme.colors.secundary : "rgba(255, 255, 255, 0.1)")};
    border-color: ${(props) => (props.active ? props.theme.colors.secundary : "rgba(255, 255, 255, 0.2)")};
  }
`