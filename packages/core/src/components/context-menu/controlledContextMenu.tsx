/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the terms of the LICENSE file distributed with this project.
 */

import classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { AbstractPureComponent } from "../../common/abstractPureComponent";
import * as Classes from "../../common/classes";
import { Position } from "../../common/position";
import { IOverlayLifecycleProps } from "../overlay/overlay";
import { Popover } from "../popover/popover";
import { IOffset, POPPER_MODIFIERS, TRANSITION_DURATION } from "./contextMenu";

export interface IContextMenuProps extends IOverlayLifecycleProps {
    menu: JSX.Element;
    usePortal?: boolean;
    onClose?: () => void;
    isDarkTheme?: boolean;
    isOpen?: boolean;
    offset?: IOffset;
}

/* istanbul ignore next */
export class ControlledContextMenu extends AbstractPureComponent<IContextMenuProps, {}> {
    private portalElement: HTMLDivElement;

    constructor(props: IContextMenuProps) {
        super(props);

        this.portalElement = document.createElement("div");
        this.portalElement.classList.add(Classes.CONTEXT_MENU);
        document.body.appendChild(this.portalElement);
    }

    public componentWillUnmount() {
        this.portalElement.remove();
    }

    public render() {
        // prevent right-clicking in a context menu
        const content = <div onContextMenu={this.cancelContextMenu}>{this.props.menu}</div>;
        const popoverClassName = classNames({ [Classes.DARK]: this.props.isDarkTheme });

        // HACKHACK: workaround until we have access to Popper#scheduleUpdate().
        // https://github.com/palantir/blueprint/issues/692
        // Generate key based on offset so a new Popover instance is created
        // when offset changes, to force recomputing position.
        const key = this.props.offset == null ? "" : `${this.props.offset.left}x${this.props.offset.top}`;

        // wrap the popover in a positioned div to make sure it is properly
        // offset on the screen.

        return ReactDOM.createPortal(
            <div className={Classes.CONTEXT_MENU_POPOVER_TARGET} style={this.props.offset}>
                <Popover
                    {...this.props}
                    backdropProps={{ onContextMenu: this.handleBackdropContextMenu }}
                    content={content}
                    enforceFocus={false}
                    key={key}
                    hasBackdrop={true}
                    isOpen={this.props.isOpen}
                    minimal={true}
                    modifiers={POPPER_MODIFIERS}
                    position={Position.RIGHT_TOP}
                    popoverClassName={popoverClassName}
                    target={<div />}
                    transitionDuration={TRANSITION_DURATION}
                />
            </div>,
            this.portalElement,
        );
    }

    private cancelContextMenu = (e: React.SyntheticEvent<HTMLDivElement>) => e.preventDefault();

    private handleBackdropContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        // React function to remove from the event pool, useful when using a event within a callback
        e.persist();
        e.preventDefault();
        // wait for backdrop to disappear so we can find the "real" element at event coordinates.
        // timeout duration is equivalent to transition duration so we know it's animated out.
        this.setTimeout(() => {
            // retrigger context menu event at the element beneath the backdrop.
            // if it has a `contextmenu` event handler then it'll be invoked.
            // if it doesn't, no native menu will show (at least on OSX) :(
            const newTarget = document.elementFromPoint(e.clientX, e.clientY);
            newTarget.dispatchEvent(new MouseEvent("contextmenu", e));
        }, TRANSITION_DURATION);
    };
}
