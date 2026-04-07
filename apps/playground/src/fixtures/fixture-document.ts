/**
 * Fixture document — a pre-built sample page for the playground.
 * Demonstrates all sample component types.
 */
import type { BuilderDocument } from "@ui-builder/builder-core";
import { CURRENT_SCHEMA_VERSION } from "@ui-builder/builder-core";
import { GRID_UNIT_PX } from "@ui-builder/shared";

export const FIXTURE_DOCUMENT: BuilderDocument = {
  id: "fixture-doc-03",
  name: "Creative Agency Landing",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  createdAt: "2026-04-05T00:00:00.000Z",
  updatedAt: "2026-04-05T00:00:00.000Z",
  rootNodeId: "root",
  breakpoints: [
    { breakpoint: "desktop", label: "Desktop", minWidth: 1280, icon: "monitor" },
    { breakpoint: "tablet", label: "Tablet", minWidth: 768, maxWidth: 1279, icon: "tablet" },
    { breakpoint: "mobile", label: "Mobile", minWidth: 0, maxWidth: 767, icon: "smartphone" },
  ],
  "nodes": {
    "root": {
      "id": "root",
      "type": "Container",
      "name": "Page Root",
      "parentId": null,
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "column",
        "gap": 0,
        "padding": 0
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "0",
        "padding": "0",
        "minHeight": "100%",
        "backgroundColor": "#ffffff",
        "fontFamily": "system-ui, -apple-system, sans-serif"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false
    },
    "66d8727b-4951-4087-af2b-4f868606d1a8": {
      "id": "66d8727b-4951-4087-af2b-4f868606d1a8",
      "type": "Section",
      "parentId": "root",
      "order": 0,
      "props": {
        "minHeight": 700
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "minHeight": "400px",
        "position": "relative",
        "alignItems": "center",
        "justifyContent": "center",
        "padding": "80px 20px",
        "backgroundColor": "#fff9f0",
        "backgroundImage": "radial-gradient(#ffdfba 1px, transparent 1px)",
        "backgroundSize": "40px 40px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Hero Cún Miêu",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.582Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "2907d524-db96-4fc6-b424-93d2e711bfdc": {
      "id": "2907d524-db96-4fc6-b424-93d2e711bfdc",
      "type": "Shape",
      "parentId": "66d8727b-4951-4087-af2b-4f868606d1a8",
      "order": 0,
      "props": {
        "shape": "blob",
        "fill": "#ffcfd2",
        "stroke": "transparent",
        "strokeWidth": 0
      },
      "style": {
        "width": "200px",
        "height": "200px",
        "display": "block",
        "position": "absolute",
        "top": "10%",
        "left": "5%",
        "opacity": "0.5",
        "zIndex": "0"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Shape",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "94d575a7-d4dc-4cc0-a5e0-0f67acdaee2f": {
      "id": "94d575a7-d4dc-4cc0-a5e0-0f67acdaee2f",
      "type": "Text",
      "parentId": "66d8727b-4951-4087-af2b-4f868606d1a8",
      "order": 1,
      "props": {
        "text": "<h1>Bạn Đồng Hành <br/><span style='color: #ff8c94'>Đáng Yêu Nhất!</span></h1>",
        "tag": "h1"
      },
      "style": {
        "fontSize": "64px",
        "color": "#4a4a4a",
        "lineHeight": "1.2",
        "fontWeight": "900",
        "textAlign": "center",
        "marginBottom": "24px",
        "zIndex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "829221d3-bd4f-4a45-b58c-78890257f9a1": {
      "id": "829221d3-bd4f-4a45-b58c-78890257f9a1",
      "type": "Text",
      "parentId": "66d8727b-4951-4087-af2b-4f868606d1a8",
      "order": 2,
      "props": {
        "text": "<p>Nơi chia sẻ tình yêu thương và những khoảnh khắc tuyệt vời cùng những người bạn bốn chân của bạn.</p>",
        "tag": "p"
      },
      "style": {
        "fontSize": "20px",
        "color": "#7a7a7a",
        "lineHeight": "1.6",
        "textAlign": "center",
        "maxWidth": "600px",
        "marginBottom": "40px",
        "zIndex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "b27594d7-f528-474e-8679-bef4866b8057": {
      "id": "b27594d7-f528-474e-8679-bef4866b8057",
      "type": "Container",
      "parentId": "66d8727b-4951-4087-af2b-4f868606d1a8",
      "order": 3,
      "props": {
        "display": "flex",
        "direction": "row",
        "gap": "20",
        "padding": "16px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "20px",
        "padding": "16px",
        "width": "100%",
        "position": "relative",
        "zIndex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "0a2b3a62-c246-41b1-92e4-21cd1922ba27": {
      "id": "0a2b3a62-c246-41b1-92e4-21cd1922ba27",
      "type": "Button",
      "parentId": "b27594d7-f528-474e-8679-bef4866b8057",
      "order": 0,
      "props": {
        "label": "<p>Tìm Bạn Mới 🐾</p>",
        "variant": "primary",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "center",
        "borderRadius": "50px",
        "cursor": "pointer",
        "fontWeight": "700",
        "fontSize": "18px",
        "border": "none",
        "backgroundColor": "#ff8c94",
        "color": "#ffffff",
        "padding": "15px 40px",
        "boxShadow": "0 10px 20px rgba(255, 140, 148, 0.3)"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "d7d6da9a-066f-489a-a915-35cb31357640": {
      "id": "d7d6da9a-066f-489a-a915-35cb31357640",
      "type": "Section",
      "parentId": "root",
      "order": 2,
      "props": {
        "minHeight": 516
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "minHeight": "516px",
        "position": "relative",
        "padding": "100px 48px",
        "backgroundColor": "#ffffff"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Section",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T10:15:28.835Z"
      }
    },
    "c979f00b-3a54-4e19-ad99-11e707070c67": {
      "id": "c979f00b-3a54-4e19-ad99-11e707070c67",
      "type": "Text",
      "parentId": "d7d6da9a-066f-489a-a915-35cb31357640",
      "order": 0,
      "props": {
        "text": "<h2>Những Gương Mặt Nổi Bật</h2>",
        "tag": "h2"
      },
      "style": {
        "fontSize": "36px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "800",
        "textAlign": "center",
        "marginBottom": "48px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "dff73ea6-a323-4ead-a20e-12063d38ff99": {
      "id": "dff73ea6-a323-4ead-a20e-12063d38ff99",
      "type": "GalleryGrid",
      "parentId": "d7d6da9a-066f-489a-a915-35cb31357640",
      "order": 1,
      "props": {
        "columns": 3,
        "gap": 20,
        "aspectRatio": "1/1",
        "images": [
          {
            "src": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
            "alt": "Cute Cat"
          },
          {
            "src": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80",
            "alt": "Happy Dog"
          },
          {
            "src": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80",
            "alt": "Cute Puppy"
          }
        ]
      },
      "style": {
        "width": "100%",
        "padding": "16px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Gallery Grid",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "94364802-4f4d-4f88-9ef8-ce49a897b4b6": {
      "id": "94364802-4f4d-4f88-9ef8-ce49a897b4b6",
      "type": "Section",
      "parentId": "root",
      "order": 4,
      "props": {
        "minHeight": 400
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "minHeight": "400px",
        "position": "relative",
        "padding": "80px 48px",
        "backgroundColor": "#f0f7ff"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Section",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "0d75bd5b-bb6b-4187-b17d-c240405b13f7": {
      "id": "0d75bd5b-bb6b-4187-b17d-c240405b13f7",
      "type": "Repeater",
      "parentId": "94364802-4f4d-4f88-9ef8-ce49a897b4b6",
      "order": 0,
      "props": {
        "count": 3,
        "columns": 3,
        "gap": 30
      },
      "style": {
        "width": "100%",
        "padding": "16px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Repeater",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "3885bd42-29b5-4262-9171-80bf6aa8ab10": {
      "id": "3885bd42-29b5-4262-9171-80bf6aa8ab10",
      "type": "Container",
      "parentId": "0d75bd5b-bb6b-4187-b17d-c240405b13f7",
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "column",
        "gap": "8px",
        "padding": "16px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "32px",
        "width": "100%",
        "position": "relative",
        "backgroundColor": "#ffffff",
        "borderRadius": "24px",
        "alignItems": "center",
        "textAlign": "center",
        "boxShadow": "0 4px 12px rgba(0,0,0,0.05)"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "c747c73d-9571-4ff2-ba75-b00c169e1387": {
      "id": "c747c73d-9571-4ff2-ba75-b00c169e1387",
      "type": "Shape",
      "parentId": "3885bd42-29b5-4262-9171-80bf6aa8ab10",
      "order": 0,
      "props": {
        "shape": "circle",
        "fill": "#b9fbc0",
        "stroke": "transparent",
        "strokeWidth": 0
      },
      "style": {
        "width": "60px",
        "height": "60px",
        "display": "block",
        "marginBottom": "20px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Shape",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "da8a4cfb-5a79-4396-af3d-e295efadfc7a": {
      "id": "da8a4cfb-5a79-4396-af3d-e295efadfc7a",
      "type": "Text",
      "parentId": "3885bd42-29b5-4262-9171-80bf6aa8ab10",
      "order": 1,
      "props": {
        "text": "<h3>Spa & Grooming</h3>",
        "tag": "h3"
      },
      "style": {
        "fontSize": "22px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "12px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "5e6700dc-d88f-428d-b2e9-6900e2830edb": {
      "id": "5e6700dc-d88f-428d-b2e9-6900e2830edb",
      "type": "Text",
      "parentId": "3885bd42-29b5-4262-9171-80bf6aa8ab10",
      "order": 2,
      "props": {
        "text": "<p>Chăm sóc sắc đẹp chuyên nghiệp cho thú cưng của bạn.</p>",
        "tag": "p"
      },
      "style": {
        "fontSize": "15px",
        "color": "#7a7a7a",
        "lineHeight": "1.6"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T09:21:17.584Z",
        "updatedAt": "2026-04-07T09:21:17.584Z"
      }
    },
    "608d3d8a-b8f2-4015-b913-40507904455c": {
      "id": "608d3d8a-b8f2-4015-b913-40507904455c",
      "type": "Section",
      "parentId": "root",
      "order": 1,
      "props": {
        "minHeight": 100
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "minHeight": "100px",
        "position": "relative",
        "backgroundColor": "#ffffff"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Section",
      "metadata": {
        "createdAt": "2026-04-07T10:14:43.698Z",
        "updatedAt": "2026-04-07T10:15:25.435Z"
      }
    },
    "7da845f6-7935-4bdc-8ccd-6c3cf47ecbaa": {
      "id": "7da845f6-7935-4bdc-8ccd-6c3cf47ecbaa",
      "type": "Container",
      "parentId": "608d3d8a-b8f2-4015-b913-40507904455c",
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "row",
        "gap": "0",
        "padding": "0",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "row",
        "gap": "8px",
        "padding": "20px 48px",
        "width": "100%",
        "position": "sticky",
        "alignItems": "center",
        "justifyContent": "space-between",
        "backgroundColor": "#ffffff",
        "borderBottom": "1px solid #eeeeee",
        "top": "0",
        "zIndex": "1000"
      },
      "responsiveStyle": {
        "mobile": {
          "padding": "15px 20px"
        }
      },
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      }
    },
    "c2437a8b-24d8-4243-81d3-ff46ed2033bf": {
      "id": "c2437a8b-24d8-4243-81d3-ff46ed2033bf",
      "type": "Container",
      "parentId": "7da845f6-7935-4bdc-8ccd-6c3cf47ecbaa",
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "row",
        "gap": "8px",
        "padding": "16px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "12px",
        "padding": "16px",
        "width": "100%",
        "position": "relative",
        "alignItems": "center"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      }
    },
    "9cacb2e3-a09b-4831-941d-b3468ed62bc2": {
      "id": "9cacb2e3-a09b-4831-941d-b3468ed62bc2",
      "type": "Shape",
      "parentId": "c2437a8b-24d8-4243-81d3-ff46ed2033bf",
      "order": 0,
      "props": {
        "shape": "circle",
        "fill": "#ff8c94",
        "stroke": "transparent",
        "strokeWidth": 0
      },
      "style": {
        "width": "32px",
        "height": "32px",
        "display": "block"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Shape",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      }
    },
    "86f0ec1f-ffdd-439e-9a1a-7465a643ff72": {
      "id": "86f0ec1f-ffdd-439e-9a1a-7465a643ff72",
      "type": "Text",
      "parentId": "c2437a8b-24d8-4243-81d3-ff46ed2033bf",
      "order": 1,
      "props": {
        "text": "Cún Miêu",
        "tag": "h4"
      },
      "style": {
        "fontSize": "20px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "800",
        "margin": "0"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      }
    },
    "9e2730a8-2b10-4b96-aa89-73fe916e15f1": {
      "id": "9e2730a8-2b10-4b96-aa89-73fe916e15f1",
      "type": "NavigationMenu",
      "parentId": "7da845f6-7935-4bdc-8ccd-6c3cf47ecbaa",
      "order": 1,
      "props": {
        "items": [
          {
            "label": "Trang Chủ",
            "link": "/"
          },
          {
            "label": "Dịch Vụ",
            "link": "/services"
          },
          {
            "label": "Thú Cưng",
            "link": "/pets"
          },
          {
            "label": "Cửa Hàng",
            "link": "/shop"
          },
          {
            "label": "Liên Hệ",
            "link": "/contact"
          }
        ],
        "layout": "horizontal",
        "textColor": "#4a4a4a",
        "activeColor": "#ff8c94",
        "fontSize": "16px",
        "gap": 32
      },
      "style": {
        "width": "100%",
        "padding": "0 16px",
        "display": "flex",
        "alignItems": "center"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Navigation Menu",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      },
      "responsiveHidden": {
        "mobile": true,
        "tablet": true
      }
    },
    "53ea7c22-e13e-4b2f-afd7-021dfefa3a96": {
      "id": "53ea7c22-e13e-4b2f-afd7-021dfefa3a96",
      "type": "Container",
      "parentId": "7da845f6-7935-4bdc-8ccd-6c3cf47ecbaa",
      "order": 2,
      "props": {
        "display": "flex",
        "direction": "column",
        "gap": "8px",
        "padding": "16px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "position": "relative",
        "alignItems": "center"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      }
    },
    "6b1751f5-a021-4cc4-a4ea-bc4ee5322162": {
      "id": "6b1751f5-a021-4cc4-a4ea-bc4ee5322162",
      "type": "Button",
      "parentId": "53ea7c22-e13e-4b2f-afd7-021dfefa3a96",
      "order": 0,
      "props": {
        "label": "Đặt Lịch Ngay",
        "variant": "primary",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "center",
        "borderRadius": "50px",
        "cursor": "pointer",
        "fontWeight": "600",
        "fontSize": "14px",
        "border": "none",
        "backgroundColor": "#ff8c94",
        "color": "#ffffff",
        "padding": "10px 24px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:14:59.558Z",
        "updatedAt": "2026-04-07T10:14:59.558Z"
      },
      "responsiveProps": {
        "mobile": {
          "label": "Đặt Lịch"
        }
      }
    },
    "c87d9ea8-d214-4bb8-a0d9-325df53e5ba9": {
      "id": "c87d9ea8-d214-4bb8-a0d9-325df53e5ba9",
      "type": "Section",
      "parentId": "root",
      "order": 3,
      "props": {
        "minHeight": 112
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "minHeight": "112px",
        "position": "relative",
        "backgroundColor": "#ffffff"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Section",
      "metadata": {
        "createdAt": "2026-04-07T10:15:03.177Z",
        "updatedAt": "2026-04-07T10:15:32.769Z"
      }
    },
    "728ee19a-1af3-42d1-95b4-179ae0a6f295": {
      "id": "728ee19a-1af3-42d1-95b4-179ae0a6f295",
      "type": "Container",
      "parentId": "c87d9ea8-d214-4bb8-a0d9-325df53e5ba9",
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "row",
        "gap": "30px",
        "padding": "60px 40px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "row",
        "gap": "40px",
        "padding": "80px 20px",
        "width": "100%",
        "position": "relative",
        "justifyContent": "space-around",
        "alignItems": "center",
        "backgroundColor": "#ffffff"
      },
      "responsiveStyle": {
        "mobile": {
          "flexDirection": "column",
          "gap": "48px"
        },
        "tablet": {
          "flexWrap": "wrap"
        }
      },
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.737Z",
        "updatedAt": "2026-04-07T10:15:13.737Z"
      }
    },
    "00fe2f68-0281-4895-93be-f6807425377e": {
      "id": "00fe2f68-0281-4895-93be-f6807425377e",
      "type": "Column",
      "parentId": "728ee19a-1af3-42d1-95b4-179ae0a6f295",
      "order": 0,
      "props": {
        "gap": 8,
        "padding": 16,
        "alignItems": "center"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative",
        "alignItems": "center",
        "textAlign": "center",
        "flex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "ca9a4b49-13a4-4ccc-a000-5141564d43bc": {
      "id": "ca9a4b49-13a4-4ccc-a000-5141564d43bc",
      "type": "Text",
      "parentId": "00fe2f68-0281-4895-93be-f6807425377e",
      "order": 0,
      "props": {
        "text": "15k+",
        "tag": "h2"
      },
      "style": {
        "fontSize": "48px",
        "color": "#ff8c94",
        "lineHeight": "1",
        "fontWeight": "900",
        "marginBottom": "8px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "2ac0d9c0-bdb4-4142-bcbe-db59563e3fee": {
      "id": "2ac0d9c0-bdb4-4142-bcbe-db59563e3fee",
      "type": "Text",
      "parentId": "00fe2f68-0281-4895-93be-f6807425377e",
      "order": 1,
      "props": {
        "text": "Active Users",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "4px",
        "textTransform": "uppercase",
        "letterSpacing": "1px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "f0daf32e-7d7c-431c-a4c0-e10db9953c26": {
      "id": "f0daf32e-7d7c-431c-a4c0-e10db9953c26",
      "type": "Text",
      "parentId": "00fe2f68-0281-4895-93be-f6807425377e",
      "order": 2,
      "props": {
        "text": "Happy pet parents joined our community.",
        "tag": "p"
      },
      "style": {
        "fontSize": "14px",
        "color": "#7a7a7a",
        "lineHeight": "1.6",
        "maxWidth": "200px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "3684871a-a2ae-4f1c-a0ca-a5a5c626bf80": {
      "id": "3684871a-a2ae-4f1c-a0ca-a5a5c626bf80",
      "type": "Column",
      "parentId": "728ee19a-1af3-42d1-95b4-179ae0a6f295",
      "order": 1,
      "props": {
        "gap": 8,
        "padding": 16,
        "alignItems": "center"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative",
        "alignItems": "center",
        "textAlign": "center",
        "flex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "e31cf6f5-e2c3-4581-a7e5-060ccc56b202": {
      "id": "e31cf6f5-e2c3-4581-a7e5-060ccc56b202",
      "type": "Text",
      "parentId": "3684871a-a2ae-4f1c-a0ca-a5a5c626bf80",
      "order": 0,
      "props": {
        "text": "120+",
        "tag": "h2"
      },
      "style": {
        "fontSize": "48px",
        "color": "#ff8c94",
        "lineHeight": "1",
        "fontWeight": "900",
        "marginBottom": "8px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "36ae0e26-8b3a-42e0-b718-b53ac32abfec": {
      "id": "36ae0e26-8b3a-42e0-b718-b53ac32abfec",
      "type": "Text",
      "parentId": "3684871a-a2ae-4f1c-a0ca-a5a5c626bf80",
      "order": 1,
      "props": {
        "text": "Cities",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "4px",
        "textTransform": "uppercase",
        "letterSpacing": "1px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "88650a18-9ffe-4c82-833e-6cbd85ef8b21": {
      "id": "88650a18-9ffe-4c82-833e-6cbd85ef8b21",
      "type": "Text",
      "parentId": "3684871a-a2ae-4f1c-a0ca-a5a5c626bf80",
      "order": 2,
      "props": {
        "text": "Providing care across the entire country.",
        "tag": "p"
      },
      "style": {
        "fontSize": "14px",
        "color": "#7a7a7a",
        "lineHeight": "1.6",
        "maxWidth": "200px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "06dd9793-f59b-4359-8964-e14ca3b865fa": {
      "id": "06dd9793-f59b-4359-8964-e14ca3b865fa",
      "type": "Column",
      "parentId": "728ee19a-1af3-42d1-95b4-179ae0a6f295",
      "order": 2,
      "props": {
        "gap": 8,
        "padding": 16,
        "alignItems": "center"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative",
        "alignItems": "center",
        "textAlign": "center",
        "flex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "ccf650b9-e444-4236-ad7d-c93901b45b4a": {
      "id": "ccf650b9-e444-4236-ad7d-c93901b45b4a",
      "type": "Text",
      "parentId": "06dd9793-f59b-4359-8964-e14ca3b865fa",
      "order": 0,
      "props": {
        "text": "99%",
        "tag": "h2"
      },
      "style": {
        "fontSize": "48px",
        "color": "#ff8c94",
        "lineHeight": "1",
        "fontWeight": "900",
        "marginBottom": "8px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "1efda8d1-0e10-4c5d-a1a8-e7baa1f7901e": {
      "id": "1efda8d1-0e10-4c5d-a1a8-e7baa1f7901e",
      "type": "Text",
      "parentId": "06dd9793-f59b-4359-8964-e14ca3b865fa",
      "order": 1,
      "props": {
        "text": "Satisfaction",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "4px",
        "textTransform": "uppercase",
        "letterSpacing": "1px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "8912e532-e14c-4678-ad4c-c9c168a65a92": {
      "id": "8912e532-e14c-4678-ad4c-c9c168a65a92",
      "type": "Text",
      "parentId": "06dd9793-f59b-4359-8964-e14ca3b865fa",
      "order": 2,
      "props": {
        "text": "Rated 5 stars by our furry friends.",
        "tag": "p"
      },
      "style": {
        "fontSize": "14px",
        "color": "#7a7a7a",
        "lineHeight": "1.6",
        "maxWidth": "200px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "f50aa1a8-3f38-4a29-bf68-e8cf70b00065": {
      "id": "f50aa1a8-3f38-4a29-bf68-e8cf70b00065",
      "type": "Column",
      "parentId": "728ee19a-1af3-42d1-95b4-179ae0a6f295",
      "order": 3,
      "props": {
        "gap": 8,
        "padding": 16,
        "alignItems": "center"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative",
        "alignItems": "center",
        "textAlign": "center",
        "flex": "1"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "ed9a019e-120e-4a37-9028-546ea96db338": {
      "id": "ed9a019e-120e-4a37-9028-546ea96db338",
      "type": "Text",
      "parentId": "f50aa1a8-3f38-4a29-bf68-e8cf70b00065",
      "order": 0,
      "props": {
        "text": "24/7",
        "tag": "h2"
      },
      "style": {
        "fontSize": "48px",
        "color": "#ff8c94",
        "lineHeight": "1",
        "fontWeight": "900",
        "marginBottom": "8px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "9a33dc24-291c-46af-99e3-db82e553d4cd": {
      "id": "9a33dc24-291c-46af-99e3-db82e553d4cd",
      "type": "Text",
      "parentId": "f50aa1a8-3f38-4a29-bf68-e8cf70b00065",
      "order": 1,
      "props": {
        "text": "Support",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#4a4a4a",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "4px",
        "textTransform": "uppercase",
        "letterSpacing": "1px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "81e7ed30-625c-4198-9a4e-69dbae47b2d7": {
      "id": "81e7ed30-625c-4198-9a4e-69dbae47b2d7",
      "type": "Text",
      "parentId": "f50aa1a8-3f38-4a29-bf68-e8cf70b00065",
      "order": 2,
      "props": {
        "text": "Always here for your pet's needs.",
        "tag": "p"
      },
      "style": {
        "fontSize": "14px",
        "color": "#7a7a7a",
        "lineHeight": "1.6",
        "maxWidth": "200px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:13.738Z",
        "updatedAt": "2026-04-07T10:15:13.738Z"
      }
    },
    "bba59e98-744e-442e-86ed-0b216e0feca0": {
      "id": "bba59e98-744e-442e-86ed-0b216e0feca0",
      "type": "Section",
      "parentId": "root",
      "order": 5,
      "props": {
        "minHeight": 400
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "minHeight": "400px",
        "position": "relative",
        "backgroundColor": "#ffffff"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Section",
      "metadata": {
        "createdAt": "2026-04-07T10:15:35.464Z",
        "updatedAt": "2026-04-07T10:15:35.464Z"
      }
    },
    "e9d64b5a-1254-4254-893e-59e88618226d": {
      "id": "e9d64b5a-1254-4254-893e-59e88618226d",
      "type": "Container",
      "parentId": "bba59e98-744e-442e-86ed-0b216e0feca0",
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "column",
        "gap": "0",
        "padding": "0",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "position": "relative",
        "backgroundColor": "#1a1a1a",
        "color": "#ffffff",
        "paddingTop": "80px",
        "paddingBottom": "40px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.840Z",
        "updatedAt": "2026-04-07T10:15:48.840Z"
      }
    },
    "e5831fae-7823-4155-ba5d-e2b1352742c3": {
      "id": "e5831fae-7823-4155-ba5d-e2b1352742c3",
      "type": "Grid",
      "parentId": "e9d64b5a-1254-4254-893e-59e88618226d",
      "order": 0,
      "props": {
        "columns": 4,
        "rows": 1,
        "columnGap": 40,
        "rowGap": 40,
        "padding": 16
      },
      "style": {
        "display": "grid",
        "columnGap": "16px",
        "rowGap": "16px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "paddingLeft": "48px",
        "paddingRight": "48px",
        "marginBottom": "60px"
      },
      "responsiveStyle": {
        "tablet": {
          "gridTemplateColumns": "1fr 1fr"
        },
        "mobile": {
          "gridTemplateColumns": "1fr",
          "paddingLeft": "24px",
          "paddingRight": "24px"
        }
      },
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Grid",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "658d77f8-4a3a-4708-87d9-6c6a1a51574f": {
      "id": "658d77f8-4a3a-4708-87d9-6c6a1a51574f",
      "type": "Column",
      "parentId": "e5831fae-7823-4155-ba5d-e2b1352742c3",
      "order": 0,
      "props": {
        "gap": 20,
        "padding": 16,
        "alignItems": "flex-start"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "6d227e35-2068-4998-87c8-d92e99f56b0e": {
      "id": "6d227e35-2068-4998-87c8-d92e99f56b0e",
      "type": "Container",
      "parentId": "658d77f8-4a3a-4708-87d9-6c6a1a51574f",
      "order": 0,
      "props": {
        "display": "flex",
        "direction": "row",
        "gap": "12px",
        "padding": "16px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "position": "relative",
        "alignItems": "center",
        "marginBottom": "16px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "f4f23161-6c12-4358-9788-a2cad5aee027": {
      "id": "f4f23161-6c12-4358-9788-a2cad5aee027",
      "type": "Shape",
      "parentId": "6d227e35-2068-4998-87c8-d92e99f56b0e",
      "order": 0,
      "props": {
        "shape": "circle",
        "fill": "#ff8c94",
        "stroke": "transparent",
        "strokeWidth": 0
      },
      "style": {
        "width": "32px",
        "height": "32px",
        "display": "block"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Shape",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "a3866dc5-c475-4e61-b37e-15ee49b60eaf": {
      "id": "a3866dc5-c475-4e61-b37e-15ee49b60eaf",
      "type": "Text",
      "parentId": "6d227e35-2068-4998-87c8-d92e99f56b0e",
      "order": 1,
      "props": {
        "text": "Cún Miêu",
        "tag": "h3"
      },
      "style": {
        "fontSize": "24px",
        "color": "#ffffff",
        "lineHeight": "1.6",
        "fontWeight": "800",
        "margin": "0"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "a64afcbe-fa3e-47c0-b154-6f2aaa8157b3": {
      "id": "a64afcbe-fa3e-47c0-b154-6f2aaa8157b3",
      "type": "Text",
      "parentId": "658d77f8-4a3a-4708-87d9-6c6a1a51574f",
      "order": 1,
      "props": {
        "text": "Providing the best care and products for your furry friends since 2010. Join our community of pet lovers.",
        "tag": "p"
      },
      "style": {
        "fontSize": "15px",
        "color": "#a0a0a0",
        "lineHeight": "1.6",
        "maxWidth": "260px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "31ff1192-69c4-4624-a69c-b18c26c396d9": {
      "id": "31ff1192-69c4-4624-a69c-b18c26c396d9",
      "type": "Column",
      "parentId": "e5831fae-7823-4155-ba5d-e2b1352742c3",
      "order": 1,
      "props": {
        "gap": 16,
        "padding": 16,
        "alignItems": "flex-start"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "50ee0595-ed89-4aad-a94b-713ab7ffde3c": {
      "id": "50ee0595-ed89-4aad-a94b-713ab7ffde3c",
      "type": "Text",
      "parentId": "31ff1192-69c4-4624-a69c-b18c26c396d9",
      "order": 0,
      "props": {
        "text": "Products",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#ffffff",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "12px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "3742d5ab-4e3e-4262-841d-be05f5bc5ff7": {
      "id": "3742d5ab-4e3e-4262-841d-be05f5bc5ff7",
      "type": "Button",
      "parentId": "31ff1192-69c4-4624-a69c-b18c26c396d9",
      "order": 1,
      "props": {
        "label": "Pet Food",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "1d8e5d25-d24b-4de8-9a77-c9e00d57c0b3": {
      "id": "1d8e5d25-d24b-4de8-9a77-c9e00d57c0b3",
      "type": "Button",
      "parentId": "31ff1192-69c4-4624-a69c-b18c26c396d9",
      "order": 2,
      "props": {
        "label": "Toys & Accessories",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "1ed4db49-9b95-4c9e-b9a7-745ffe6ba573": {
      "id": "1ed4db49-9b95-4c9e-b9a7-745ffe6ba573",
      "type": "Button",
      "parentId": "31ff1192-69c4-4624-a69c-b18c26c396d9",
      "order": 3,
      "props": {
        "label": "Health Supplies",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "b934807a-1a87-4255-aa87-8ba26c2668df": {
      "id": "b934807a-1a87-4255-aa87-8ba26c2668df",
      "type": "Column",
      "parentId": "e5831fae-7823-4155-ba5d-e2b1352742c3",
      "order": 2,
      "props": {
        "gap": 16,
        "padding": 16,
        "alignItems": "flex-start"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "1efa47ba-2397-4f9d-a0d4-d9313ee3e0a0": {
      "id": "1efa47ba-2397-4f9d-a0d4-d9313ee3e0a0",
      "type": "Text",
      "parentId": "b934807a-1a87-4255-aa87-8ba26c2668df",
      "order": 0,
      "props": {
        "text": "Company",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#ffffff",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "12px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "4c8f13f1-0747-4d49-bd94-06976e7bbe12": {
      "id": "4c8f13f1-0747-4d49-bd94-06976e7bbe12",
      "type": "Button",
      "parentId": "b934807a-1a87-4255-aa87-8ba26c2668df",
      "order": 1,
      "props": {
        "label": "About Us",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "5db5a59f-1dd8-449b-8af9-da36943452e9": {
      "id": "5db5a59f-1dd8-449b-8af9-da36943452e9",
      "type": "Button",
      "parentId": "b934807a-1a87-4255-aa87-8ba26c2668df",
      "order": 2,
      "props": {
        "label": "Careers",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "7626186e-42b5-481d-b522-26fd9c9c5441": {
      "id": "7626186e-42b5-481d-b522-26fd9c9c5441",
      "type": "Button",
      "parentId": "b934807a-1a87-4255-aa87-8ba26c2668df",
      "order": 3,
      "props": {
        "label": "Contact",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "97876b79-3e4f-447d-a7da-4d54c83858b6": {
      "id": "97876b79-3e4f-447d-a7da-4d54c83858b6",
      "type": "Column",
      "parentId": "e5831fae-7823-4155-ba5d-e2b1352742c3",
      "order": 3,
      "props": {
        "gap": 16,
        "padding": 16,
        "alignItems": "flex-start"
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "minHeight": "80px",
        "position": "relative"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Column",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "80073be5-7b79-4333-8ca9-edb8f61a85b0": {
      "id": "80073be5-7b79-4333-8ca9-edb8f61a85b0",
      "type": "Text",
      "parentId": "97876b79-3e4f-447d-a7da-4d54c83858b6",
      "order": 0,
      "props": {
        "text": "Resources",
        "tag": "h4"
      },
      "style": {
        "fontSize": "18px",
        "color": "#ffffff",
        "lineHeight": "1.6",
        "fontWeight": "700",
        "marginBottom": "12px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "5791bfe2-d3cf-4af7-bf3c-38f3fc56c65d": {
      "id": "5791bfe2-d3cf-4af7-bf3c-38f3fc56c65d",
      "type": "Button",
      "parentId": "97876b79-3e4f-447d-a7da-4d54c83858b6",
      "order": 1,
      "props": {
        "label": "Pet Care Blog",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "91faff1c-bf56-4348-9740-a626d4f00127": {
      "id": "91faff1c-bf56-4348-9740-a626d4f00127",
      "type": "Button",
      "parentId": "97876b79-3e4f-447d-a7da-4d54c83858b6",
      "order": 2,
      "props": {
        "label": "Help Center",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "f830a91a-4cd2-4a50-90ab-8ca241f2f1a4": {
      "id": "f830a91a-4cd2-4a50-90ab-8ca241f2f1a4",
      "type": "Button",
      "parentId": "97876b79-3e4f-447d-a7da-4d54c83858b6",
      "order": 3,
      "props": {
        "label": "Privacy Policy",
        "variant": "ghost",
        "size": "md",
        "disabled": false
      },
      "style": {
        "display": "inline-flex",
        "alignItems": "center",
        "justifyContent": "flex-start",
        "borderRadius": "6px",
        "cursor": "pointer",
        "fontWeight": "500",
        "fontSize": "15px",
        "border": "none",
        "backgroundColor": "#111827",
        "color": "#a0a0a0",
        "padding": "0",
        "textAlign": "left"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Button",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "da002e28-bd5f-459b-b283-a274256622a3": {
      "id": "da002e28-bd5f-459b-b283-a274256622a3",
      "type": "Divider",
      "parentId": "e9d64b5a-1254-4254-893e-59e88618226d",
      "order": 1,
      "props": {
        "orientation": "horizontal",
        "thickness": 1,
        "color": "#333333"
      },
      "style": {
        "width": "100%",
        "height": "1px",
        "backgroundColor": "#e5e7eb",
        "marginBottom": "32px"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Divider",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "1bee3706-5321-4abe-9007-4a53e510a70b": {
      "id": "1bee3706-5321-4abe-9007-4a53e510a70b",
      "type": "Container",
      "parentId": "e9d64b5a-1254-4254-893e-59e88618226d",
      "order": 2,
      "props": {
        "display": "flex",
        "direction": "row",
        "gap": "8px",
        "padding": "0 48px",
        "showPlaceholder": true
      },
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "gap": "8px",
        "padding": "16px",
        "width": "100%",
        "position": "relative",
        "justifyContent": "space-between",
        "alignItems": "center"
      },
      "responsiveStyle": {
        "mobile": {
          "flexDirection": "column",
          "gap": "16px",
          "textAlign": "center"
        }
      },
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Container",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "8de76260-0afa-488c-95ff-98144d08767c": {
      "id": "8de76260-0afa-488c-95ff-98144d08767c",
      "type": "Text",
      "parentId": "1bee3706-5321-4abe-9007-4a53e510a70b",
      "order": 0,
      "props": {
        "text": "© 2024 Cún Miêu Agency. All rights reserved.",
        "tag": "p"
      },
      "style": {
        "fontSize": "14px",
        "color": "#666666",
        "lineHeight": "1.6"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    },
    "c2774b69-1f94-4635-916b-72ef2290508e": {
      "id": "c2774b69-1f94-4635-916b-72ef2290508e",
      "type": "Text",
      "parentId": "1bee3706-5321-4abe-9007-4a53e510a70b",
      "order": 1,
      "props": {
        "text": "Made with ❤️ for Pets",
        "tag": "p"
      },
      "style": {
        "fontSize": "14px",
        "color": "#666666",
        "lineHeight": "1.6"
      },
      "responsiveStyle": {},
      "interactions": [],
      "hidden": false,
      "locked": false,
      "name": "Text",
      "metadata": {
        "createdAt": "2026-04-07T10:15:48.841Z",
        "updatedAt": "2026-04-07T10:15:48.841Z"
      }
    }
  },

  variables: {},
  assets: { version: "1.0", assets: [] },
  plugins: [],
  canvasConfig: {
    width: 1280,
    height: 1200,
    backgroundColor: "#f8fafc",
    showGrid: true,
    gridSize: GRID_UNIT_PX,
    snapEnabled: true,
    snapToGrid: true,
    snapToComponents: true,
    snapThreshold: 6,
    rulerEnabled: true,
    showHelperLines: true,
  },
  metadata: {
    author: "Playground",
    pluginData: {},
  },
};
