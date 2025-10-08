export declare function isEqual(x: any, y: any): boolean;
export declare class ObjectSet<V> {
    private buckets;
    put(value: V): void;
    contains(value: V): boolean;
    values(): V[];
    stats(): {
        totalBuckets: number;
        collisions: number;
        totalValues: number;
        hashEffectiveness: number;
    };
    private hashCodeOf;
}
