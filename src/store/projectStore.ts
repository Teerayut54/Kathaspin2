import { create } from 'zustand';

export interface Metadata {
  projectName: string;
}

export interface Performer {
  id: string;
  name: string;
  color: string;
  symbol: string;
}

export interface SetPositions {
  [performerId: string]: { x: number; y: number };
}

export interface SetData {
  setNumber: number;
  title: string;
  duration: number;
  positions: SetPositions;
}

export interface ProjectData {
  metadata: Metadata;
  performers: Performer[];
  sets: SetData[];
}

export interface CanvasConfig {
  width: number;
  height: number;
  scale: number;
}

interface ProjectState {
  data: ProjectData;
  currentSetIndex: number; // ใช้ระบุเซ็ตที่เลือก/แสดงอยู่ปัจจุบัน
  currentTime: number;
  isPlaying: boolean;
  selectedPerformerId: string | null;
  canvasConfig: CanvasConfig; // สเตตเก็บขนาดสนามและสเกลที่เพิ่มเข้ามาใหม่

  setData: (data: ProjectData) => void;
  updateMetadata: (meta: Partial<Metadata>) => void;

  addPerformer: (performer: Performer) => void;
  updatePerformer: (id: string, updates: Partial<Performer>) => void;
  removePerformer: (id: string) => void;

  addSet: (set: SetData) => void;
  updateSetPositions: (setIndex: number, performerId: string, x: number, y: number) => void;
  updateSetTitle: (setIndex: number, title: string) => void; // ฟังก์ชันอัปเดตชื่อเซ็ต
  updateSetDuration: (setIndex: number, newDuration: number) => void; // 🛠️ รวมเหลือตัวเดียว รับเป็น Index ปลอดภัยที่สุด

  setCurrentSetIndex: (index: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;

  copySet: (setIndex: number) => void;
  removeSet: (setIndex: number) => void;

  setSelectedPerformerId: (id: string | null) => void;
  updateCanvasSize: (width: number, height: number) => void; // ฟังก์ชันปรับขนาดสนาม
}

export const useProjectStore = create<ProjectState>((set) => ({
  data: {
    metadata: { projectName: 'My Marching Show' },
    performers: [
      { id: 'P01', name: 'Trumpet 1', color: '#ef4444', symbol: 'x' },
      { id: 'C01', name: 'Drum Major', color: '#3b82f6', symbol: 'o' }
    ],
    sets: [
      {
        setNumber: 0,
        title: 'Start',
        duration: 0, // เซ็ตแรกสุดเป็นจุดสตาร์ท เริ่มที่ 0 วินาทีเสมอ
        positions: {
          'P01': { x: -3, y: 4 },
          'C01': { x: 0, y: 2 }
        }
      },
      {
        setNumber: 1,
        title: 'First Move',
        duration: 16,
        positions: {
          'P01': { x: 3, y: 8 },
          'C01': { x: 0, y: 5 }
        }
      }
    ]
  },
  currentSetIndex: 0,
  currentTime: 0,
  isPlaying: false,
  selectedPerformerId: null,
  
  // ค่าเริ่มต้นของ Canvas กำหนดไว้ที่นี่
  canvasConfig: {
    width: 1200,
    height: 600,
    scale: 50,
  },

  setData: (data) => set({ data }),

  updateMetadata: (meta) => set((state) => ({
    data: { ...state.data, metadata: { ...state.data.metadata, ...meta } }
  })),

  addPerformer: (performer) => set((state) => {
    const newSets = state.data.sets.map(s => ({
      ...s,
      positions: { ...s.positions, [performer.id]: { x: 0, y: 0 } }
    }));
    return {
      data: { ...state.data, performers: [...state.data.performers, performer], sets: newSets }
    };
  }),

  updatePerformer: (id, updates) => set((state) => ({
    data: {
      ...state.data,
      performers: state.data.performers.map(p => p.id === id ? { ...p, ...updates } : p)
    }
  })),

  removePerformer: (id) => set((state) => {
    const newSets = state.data.sets.map(s => {
      const newPos = { ...s.positions };
      delete newPos[id];
      return { ...s, positions: newPos };
    });
    return {
      data: {
        ...state.data,
        performers: state.data.performers.filter(p => p.id !== id),
        sets: newSets
      },
      selectedPerformerId: state.selectedPerformerId === id ? null : state.selectedPerformerId,
    };
  }),

  addSet: (newSet) => set((state) => ({
    data: { ...state.data, sets: [...state.data.sets, newSet] }
  })),

  updateSetPositions: (setIndex, performerId, x, y) => set((state) => {
    const newSets = [...state.data.sets];
    if (newSets[setIndex]) {
      newSets[setIndex].positions = {
        ...newSets[setIndex].positions,
        [performerId]: { x, y }
      };
    }
    return { data: { ...state.data, sets: newSets } };
  }),

  // 🛠️ ปรับปรุงลอจิกให้รับค่าเป็น Index และมีระบบ Safe-Guard ป้องกันวิเป็น 0 หรือติดลบ
  updateSetDuration: (setIndex, newDuration) => set((state) => {
    const newSets = [...state.data.sets];
    if (newSets[setIndex]) {
      // เซ็ตที่ 0 บังคับเป็น 0 วินาทีเสมอ ส่วนเซ็ตที่เหลือต้องมีเวลาขั้นต่ำอย่างน้อย 0.5 วินาที
      newSets[setIndex].duration = setIndex === 0 ? 0 : Math.max(0.5, newDuration);
    }
    return { data: { ...state.data, sets: newSets } };
  }),

  // ฟังก์ชันอัปเดตชื่อเซ็ต
  updateSetTitle: (setIndex, title) => set((state) => {
    const newSets = [...state.data.sets];
    if (newSets[setIndex]) {
      newSets[setIndex].title = title;
    }
    return { data: { ...state.data, sets: newSets } };
  }),

  setCurrentSetIndex: (index) => set({ currentSetIndex: index }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  copySet: (setIndex) => set((state) => {
    const currentSets = state.data.sets;
    const setToCopy = currentSets[setIndex];
    if (!setToCopy) return {};

    const duplicatedPositions = JSON.parse(JSON.stringify(setToCopy.positions));

    const newSet: SetData = {
      setNumber: currentSets.length,
      title: `${setToCopy.title} (Copy)`,
      duration: setToCopy.duration || 8,
      positions: duplicatedPositions
    };

    return {
      data: { ...state.data, sets: [...currentSets, newSet] },
      currentSetIndex: currentSets.length
    };
  }),

  removeSet: (setIndex) => set((state) => {
    const currentSets = state.data.sets;

    if (setIndex === 0 || currentSets.length <= 1) {
      alert("ไม่สามารถลบเซ็ตเริ่มต้นได้");
      return {};
    }

    const filteredSets = currentSets.filter((_, idx) => idx !== setIndex);
    const reindexedSets = filteredSets.map((s, idx) => ({ ...s, setNumber: idx }));
    const nextActiveIndex = Math.max(0, setIndex - 1);

    return {
      data: { ...state.data, sets: reindexedSets },
      currentSetIndex: nextActiveIndex,
      currentTime: 0
    };
  }),

  setSelectedPerformerId: (id) => set({ selectedPerformerId: id }),

  // ฟังก์ชันปรับขนาดสนาม
  updateCanvasSize: (width, height) => set((state) => ({
    canvasConfig: {
      width,
      height,
      scale: state.canvasConfig.scale 
    }
  })),
}));