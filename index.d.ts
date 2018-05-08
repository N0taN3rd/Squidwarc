/// <reference types="eventemitter3" />

import {EventEmitter} from 'eventemitter3';

interface Crawler extends EventEmitter {
    init(): Promise<void>;
    navigate(url: string): void;
    stopPageLoading(): Promise<void>;
    stopCapturingNetwork(): void;
    stop(): Promise<void>;
}