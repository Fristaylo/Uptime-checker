import React from "react";
import styles from "./Header.module.scss";
import DomainDropdown from "../DomainDropDown/DomainDropdown.tsx";
import logo from "../../images/Status-logo.svg";
import { Link } from "react-router-dom";


const Header: React.FC = () => {
    return (
        <div className={styles.headerContainer}>
            <div className={styles.header}>
                <Link to="/" className={styles.logoLink}>
                    <div className={styles.logoContainer}>
                        <img src={logo} alt="YummyUptime Logo" className={styles.logoImg} />
                        <span className={styles.logo}>YummyUptime</span>
                    </div>
                </Link>
                <nav className={styles.nav}>
                    <DomainDropdown />
                </nav>
            </div>
        </div>
    );
};

export default Header;