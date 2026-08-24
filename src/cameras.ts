export interface Camera {
  id: string;
  name: string;
  host: string;
  port: number;
}

export const cameras: Camera[] = [
  {
    id: "camera-01",
    name: "Front Door",
    host: "192.168.0.1",
    port: 554,
  },
  
  {
    id: "camera-02",
    name: "Back Door",
    host: "192.168.0.2",
    port: 554,
  },

  {
    id: "camera-03",
    name: "Basement",
    host: "192.168.0.3",
    port: 554,
  },

  {
    id: "camera-04",
    name: "Garage",
    host: "192.168.0.4",
    port: 1554,
  },

  {
    id: "camera-05",
    name: "Driveway",
    host: "192.168.0.5",
    port: 554,
  },

  {
    id: "camera-06",
    name: "Backyard",
    host: "192.168.0.6",
    port: 1554,
  },

  {
    id: "camera-07",
    name: "Side Gate",
    host: "192.168.0.7",
    port: 554,
  },
];