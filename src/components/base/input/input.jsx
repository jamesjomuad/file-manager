"use client";

import { createContext, useContext } from "react";
import {
  FieldError as AriaFieldError,
  Group as AriaGroup,
  Input as AriaInput,
  TextField as AriaTextField,
  useLocale,
} from "react-aria-components";
import { Label } from "./label";
import { HintText, hintTextClassName } from "./hint-text";
import { cx, sortCx } from "@/utils/cx";

/**
 * Figma source: Board UI → Input (node 3665:1849).
 *
 * Architecture (mirrors the Untitled UI / React Aria pattern):
 *
 *   InputBase   — the styled field shell. Renders <AriaGroup> + adornments
 *                 + <AriaInput>. State (hover / focus / disabled / invalid)
 *                 arrives as render-prop booleans from Aria.
 *   TextField   — wraps <AriaTextField> and a TextFieldContext so size /
 *                 classes can flow from the composer down into InputBase
 *                 without prop drilling.
 *   Input       — opinionated composition: TextField → Label → InputBase
 *                 → HintText, or React Aria's FieldError for `errorMessage`
 *                 while the field is invalid. The component most consumers use.
 *
 * Why React Aria:
 *   - Label ↔ input ↔ hint association via aria-labelledby / aria-describedby
 *   - aria-required, aria-invalid auto-applied
 *   - Form library / native validation integration
 *   - i18n, RTL, autofill edge cases handled
 *   - Render-prop state surfaces `isFocusWithin`, `isHovered`, `isDisabled`,
 *     `isInvalid`, `isRequired` — no CSS pseudo gymnastics
 *
 * Visuals stay 1:1 with Figma — see `styles/theme.css` for the tokens.
 */

/* -------------------------------------------------------------------------- */
/*  TextFieldContext                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Shared by every field that wants Input's shell — `Textarea` reads the same
 * size and class overrides out of it, so a composed form stays consistent.
 */
export const TextFieldContext = createContext({});

/* -------------------------------------------------------------------------- */
/*  TextField                                                                  */
/* -------------------------------------------------------------------------- */

export function TextField({
  size = "medium",
  fieldClassName,
  inputClassName,
  className,
  children,
  ...props
}) {
  return (
    <TextFieldContext.Provider value={{ size, fieldClassName, inputClassName }}>
      <AriaTextField
        {...props}
        data-input-size={size}
        className={cx(
          "group flex h-max w-full flex-col items-start gap-1",
          className,
        )}
      >
        {children}
      </AriaTextField>
    </TextFieldContext.Provider>
  );
}

TextField.displayName = "TextField";

/* -------------------------------------------------------------------------- */
/*  InputBase                                                                  */
/* -------------------------------------------------------------------------- */

const inputStyles = sortCx({
  field: [
    "relative flex w-full items-center",
    "rounded-2lg",
    "bg-background-tertiary-default text-foreground-icon-tertiary",
    "ring-2 ring-inset ring-transparent",
    "transition-[background-color,box-shadow,color] duration-[var(--input-transition-ms)] ease",
  ].join(" "),

  fieldSize: {
    medium: "p-2",                // 8px all sides → h auto = 36
    small:  "h-8 px-1.5 py-2",    // 32 / 6 / 8
  },

  // When a leadingAddon is present (Phone basic): tighten left padding.
  fieldWithAddonSize: {
    medium: "h-9 ps-1 pe-2 py-2", // 36 / 4 / 8 / 8
    small:  "h-8 ps-1 pe-1.5 py-2",
  },

  content: "flex w-full items-center gap-2 min-w-0",
  leftSection: "flex flex-1 items-center gap-0.5 min-w-0",

  input: [
    "min-w-0 flex-1 bg-transparent border-0 outline-none p-0 m-0",
    "font-sans text-body-regular text-text-primary",
    "placeholder:text-text-tertiary",
    "focus:placeholder:text-text-primary",
    "disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text",
    "disabled:cursor-not-allowed",
    "aria-invalid:placeholder:text-text-error-placeholder",
  ].join(" "),

  icon: "size-5 shrink-0",
});

/**
 * The field shell's classes for a state. InputBase uses it, and so do fields
 * whose editable part isn't an <input> (Time Field's segments).
 */
export function inputFieldClassName(
  { isFocusWithin, isHovered, isDisabled, isInvalid },
  size = "medium",
  hasAddon = false,
) {
  return cx(
    inputStyles.field,
    hasAddon ? inputStyles.fieldWithAddonSize[size] : inputStyles.fieldSize[size],
    // Hover: idle, no focus, no disabled, no invalid
    isHovered && !isFocusWithin && !isDisabled && !isInvalid && "ring-border-button-hover",
    // Focus wins over hover
    isFocusWithin && !isDisabled && !isInvalid && "ring-border-button-active",
    // Disabled
    isDisabled && "bg-input-disabled-background text-input-disabled-foreground",
    // Invalid
    isInvalid && "bg-background-tertiary-error text-foreground-icon-error",
  );
}

export function InputBase({
  size: sizeProp,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  leadingAddon,
  trailingAddon,
  fieldClassName,
  className,
  ref,
  groupRef,
  ...inputProps
}) {
  const { direction } = useLocale();
  const ctx = useContext(TextFieldContext);
  const size = sizeProp ?? ctx.size ?? "medium";
  const hasAddon = leadingAddon !== undefined && leadingAddon !== null;

  return (
    <AriaGroup
      ref={groupRef}
      className={(state) => cx(inputFieldClassName(state, size, hasAddon), ctx.fieldClassName, fieldClassName)}
    >
      <div className={inputStyles.content}>
        <div className={inputStyles.leftSection}>
          {hasAddon ? (
            leadingAddon
          ) : Leading ? (
            <Leading className={inputStyles.icon} aria-hidden />
          ) : null}
          <AriaInput
            ref={ref}
            {...inputProps}
            // Align to the field's start even when email/URL values use LTR.
            className={cx(inputStyles.input, direction === "rtl" ? "pr-1 text-right" : "pl-1 text-left", ctx.inputClassName, className)}
          />
        </div>
        {trailingAddon ?? (Trailing ? (
          <Trailing className={inputStyles.icon} aria-hidden />
        ) : null)}
      </div>
    </AriaGroup>
  );
}

InputBase.displayName = "InputBase";

/* -------------------------------------------------------------------------- */
/*  Input (composed)                                                           */
/* -------------------------------------------------------------------------- */

export function Input({
  label,
  hint,
  errorMessage,
  tooltip,
  placeholder,
  inputDir,
  leadingIcon,
  trailingIcon,
  leadingAddon,
  fieldClassName,
  ref,
  groupRef,
  className,
  ...textFieldProps
}) {
  return (
    <TextField
      {...textFieldProps}
      className={className}
      // Don't clobber an explicit aria-label; fall back to the placeholder
      // only for unlabelled fields that don't provide one.
      aria-label={
        textFieldProps["aria-label"] ??
        (!label && typeof placeholder === "string" ? placeholder : undefined)
      }
    >
      {({ isRequired, isInvalid }) => (
        <>
          {label && (
            <Label
              isRequired={isRequired}
              isInvalid={isInvalid}
              tooltip={tooltip}
            >
              {label}
            </Label>
          )}
          <InputBase
            dir={inputDir ?? (["email", "url", "tel"].includes(textFieldProps.type ?? "") ? "ltr" : undefined)}
            ref={ref}
            groupRef={groupRef}
            placeholder={placeholder}
            leadingIcon={leadingIcon}
            trailingIcon={trailingIcon}
            leadingAddon={leadingAddon}
            fieldClassName={fieldClassName}
          />
          {isInvalid && errorMessage != null ? (
            <AriaFieldError className={hintTextClassName(true)}>{errorMessage}</AriaFieldError>
          ) : (
            hint && <HintText isInvalid={isInvalid}>{hint}</HintText>
          )}
        </>
      )}
    </TextField>
  );
}

Input.displayName = "Input";
