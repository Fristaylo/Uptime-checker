import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.scss';
import { domains } from '../data/constants';

const Header: React.FC = () => {
  const location = useLocation();

  return (
    <div className={styles.headerContainer}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <span className={styles.logo}>YummyUptime</span>
        </div>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li className={styles.navItem}>
              <Link
                to="/"
                className={`${styles.navLink} ${
                  location.pathname === '/' ? styles.active : ''
                }`}
              >
                <span className={styles.text}>Главная</span>
              </Link>
            </li>
            {domains.map((domain, index) => (
              <li className={styles.navItem} key={index}>
                <Link
                  to={`/${domain}`}
                  className={`${styles.navLink} ${
                    location.pathname === `/${domain}` ? styles.active : ''
                  }`}
                >
                  <span className={styles.text}>{domain}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Header;