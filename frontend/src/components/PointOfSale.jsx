import React, { useState, useEffect } from 'react';
import { 
  Grid, Paper, Typography, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Card, CardContent, CardActions, IconButton, Container, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import API from '../api/axiosInstance'; // Asegúrate que esta ruta sea correcta

const PointOfSale = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);

  // Cargar productos al inicio
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await API.get('/productos'); // O '/inventario' según tu backend
      setProductos(res.data);
    } catch (error) {
      console.error("Error cargando productos", error);
    }
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_barras.includes(busqueda)
  );

  // Agregar al carrito
  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item.id === producto.id);
    if (existe) {
      setCarrito(carrito.map(item => 
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  // Calcular Total automáticamente
  useEffect(() => {
    const nuevoTotal = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);
    setTotal(nuevoTotal);
  }, [carrito]);

  // Eliminar del carrito
  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  // Guardar Venta (Ejemplo básico)
  const handleCobrar = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    try {
      await API.post('/ventas', { items: carrito, total });
      alert("Venta realizada con éxito");
      setCarrito([]);
      setTotal(0);
    } catch (error) {
      console.error("Error al cobrar", error);
      alert("Error al procesar la venta");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2, p: { xs: 1, md: 3 } }}>
      {/* Título y Buscador */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          Punto de Venta
        </Typography>
        <TextField
          fullWidth
          label="Buscar producto (Nombre o Código)"
          variant="outlined"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </Box>

      {/* SISTEMA DE GRILLA RESPONSIVE */}
      <Grid container spacing={2}>
        
        {/* COLUMNA IZQUIERDA: PRODUCTOS */}
        {/* xs={12} significa que en celular ocupa todo el ancho */}
        {/* md={8} significa que en PC ocupa el 66% del ancho */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>Catálogo</Typography>
          <Grid container spacing={2}>
            {productosFiltrados.map((prod) => (
              <Grid item xs={6} sm={4} md={3} key={prod.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1, p: 1 }}>
                    <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                      {prod.nombre}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                      ${prod.precio_venta}
                    </Typography>
                    <Typography variant="caption" display="block" color={prod.cantidad > 0 ? "success.main" : "error.main"}>
                      Stock: {prod.cantidad || 0}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      fullWidth 
                      variant="contained" 
                      startIcon={<AddShoppingCartIcon />}
                      onClick={() => agregarAlCarrito(prod)}
                    >
                      Agregar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* COLUMNA DERECHA: CARRITO DE COMPRAS */}
        {/* En celular baja al final (xs=12), en PC se queda a la derecha (md=4) */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, position: { md: 'sticky' }, top: 20 }}>
            <Typography variant="h5" gutterBottom align="center">
              Carrito
            </Typography>
            
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prod</TableCell>
                    <TableCell align="right">Cant</TableCell>
                    <TableCell align="right">Subt</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrito.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{item.nombre}</TableCell>
                      <TableCell align="right">{item.cantidad}</TableCell>
                      <TableCell align="right">${(item.precio_venta * item.cantidad).toFixed(2)}</TableCell>
                      <TableCell align="right" padding="none">
                        <IconButton size="small" color="error" onClick={() => eliminarDelCarrito(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                Total: ${total.toFixed(2)}
              </Typography>
              <Button 
                variant="contained" 
                color="success" 
                fullWidth 
                size="large" 
                sx={{ mt: 2, py: 1.5 }}
                onClick={handleCobrar}
              >
                COBRAR
              </Button>
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Container>
  );
};

export default PointOfSale;