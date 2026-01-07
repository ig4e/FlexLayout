import { describe, it, expect } from 'vitest';
import { DockLocation, Rect, Model, TabSetNode } from '../src';

describe("RTL Support", () => {

    describe("DockLocation", () => {
        const rect = new Rect(0, 0, 100, 100);

        it("getLocation mirrors horizontally in RTL", () => {
            expect(DockLocation.getLocation(rect, 10, 50, false)).equal(DockLocation.LEFT);
            expect(DockLocation.getLocation(rect, 10, 50, true)).equal(DockLocation.RIGHT);

            expect(DockLocation.getLocation(rect, 90, 50, false)).equal(DockLocation.RIGHT);
            expect(DockLocation.getLocation(rect, 90, 50, true)).equal(DockLocation.LEFT);
        });

        it("getDockRect mirrors LEFT/RIGHT in RTL", () => {
            const r = new Rect(0, 0, 100, 100);
            
            const leftLtr = DockLocation.LEFT.getDockRect(r, false);
            expect(leftLtr.x).equal(0);
            expect(leftLtr.width).equal(50);

            const leftRtl = DockLocation.LEFT.getDockRect(r, true);
            expect(leftRtl.x).equal(50);
            expect(leftRtl.width).equal(50);

            const rightLtr = DockLocation.RIGHT.getDockRect(r, false);
            expect(rightLtr.x).equal(50);
            expect(rightLtr.width).equal(50);

            const rightRtl = DockLocation.RIGHT.getDockRect(r, true);
            expect(rightRtl.x).equal(0);
            expect(rightRtl.width).equal(50);
        });
    });

    describe("Model", () => {
        it("isRtl returns true when enableRtl is set", () => {
            const model = Model.fromJson({
                global: { enableRtl: true },
                layout: { type: "row", children: [] }
            });
            expect(model.isRtl()).equal(true);
        });
    });

    describe("RowNode Splitter logic in RTL", () => {
        const createRtlModel = () => {
            const model = Model.fromJson({
                global: { enableRtl: true, splitterSize: 10 },
                layout: {
                    type: "row",
                    children: [
                        { type: "tabset", weight: 50, id: "ts1", enableDeleteWhenEmpty: false, minWidth: 0, children: [] },
                        { type: "tabset", weight: 50, id: "ts2", enableDeleteWhenEmpty: false, minWidth: 0, children: [] }
                    ]
                }
            });
            // Ensure min sizes are calculated
            model.getRoot().calcMinMaxSize();
            return model;
        };

        it("getSplitterBounds in RTL", () => {
            const rtlModel = createRtlModel();
            const root = rtlModel.getRoot();
            root.setRect(new Rect(0, 0, 210, 100)); 
            
            const ts1 = rtlModel.getNodeById("ts1") as TabSetNode;
            const ts2 = rtlModel.getNodeById("ts2") as TabSetNode;
            
            // Physical order in RTL: [ts2] [S] [ts1]
            ts1.setRect(new Rect(110, 0, 100, 100));
            ts2.setRect(new Rect(0, 0, 100, 100));

            const bounds = root.getSplitterBounds(1);
            // Range [0, 200]
            expect(bounds[0]).equal(0);
            expect(bounds[1]).equal(200);
        });

        it("getSplitterInitials in RTL", () => {
            const rtlModel = createRtlModel();
            const root = rtlModel.getRoot();
            root.setRect(new Rect(0, 0, 210, 100));
            
            const ts1 = rtlModel.getNodeById("ts1") as TabSetNode;
            const ts2 = rtlModel.getNodeById("ts2") as TabSetNode;
            
            ts1.setRect(new Rect(110, 0, 100, 100));
            ts2.setRect(new Rect(0, 0, 100, 100));

            const initials = root.getSplitterInitials(1);
            expect(initials.initialSizes).deep.equal([100, 100]);
            expect(initials.sum).equal(200);
            expect(initials.startPosition).equal(100);
        });

        it("calculateSplit in RTL - moving physically right", () => {
            const rtlModel = createRtlModel();
            const root = rtlModel.getRoot();
            root.setRect(new Rect(0, 0, 210, 100));
            
            const ts1 = rtlModel.getNodeById("ts1") as TabSetNode;
            const ts2 = rtlModel.getNodeById("ts2") as TabSetNode;
            
            ts1.setRect(new Rect(110, 0, 100, 100));
            ts2.setRect(new Rect(0, 0, 100, 100));

            const initials = root.getSplitterInitials(1);
            // Moving splitter right to 150.
            // In RTL, moving splitter right means ts1 (logically before) shrinks, ts2 (logically after) grows.
            // Wait, in my calculateSplit: mirroredPos = 2*100 - 150 = 50.
            // 50 < 100 -> sizes[index] grows. sizes[1] grows. ts2 grows.
            // ts2 is physically on the left. moving splitter right makes it bigger. Correct.
            const weights = root.calculateSplit(1, 150, initials.initialSizes, initials.sum, initials.startPosition);
            // weights = [25, 75]
            expect(weights).deep.equal([25, 75]);
        });

        it("calculateSplit in RTL - moving physically left", () => {
            const rtlModel = createRtlModel();
            const root = rtlModel.getRoot();
            root.setRect(new Rect(0, 0, 210, 100));
            
            const ts1 = rtlModel.getNodeById("ts1") as TabSetNode;
            const ts2 = rtlModel.getNodeById("ts2") as TabSetNode;
            
            ts1.setRect(new Rect(110, 0, 100, 100));
            ts2.setRect(new Rect(0, 0, 100, 100));

            const initials = root.getSplitterInitials(1);
            // Moving splitter left to 50.
            // mirroredPos = 2*100 - 50 = 150.
            // 150 > 100 -> sizes[index-1] grows. sizes[0] grows. ts1 grows.
            // ts1 is physically on the right. moving splitter left makes it bigger. Correct.
            const weights = root.calculateSplit(1, 50, initials.initialSizes, initials.sum, initials.startPosition);
            // weights = [75, 25]
            expect(weights).deep.equal([75, 25]);
        });
    });
});