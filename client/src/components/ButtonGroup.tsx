import styles from "./ButtonGroup.module.scss";

interface Option {
    value: string;
    label: string;
}

interface ButtonGroupProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
}

const ButtonGroup = ({ options, value, onChange }: ButtonGroupProps) => {
    return (
        <div className={styles.buttonGroup}>
            {options.map((option) => (
                <button
                    key={option.value}
                    className={value === option.value ? styles.active : ""}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
};

export default ButtonGroup;
